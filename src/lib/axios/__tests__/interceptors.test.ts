import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { setupRequestInterceptor, setupResponseInterceptor } from "../interceptors";
import { setToastListener } from "@/lib/toast";
import { store } from "@/store";
import { logout, setCredentials } from "@/store/slices/auth-slice";
import { TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRES_AT_KEY } from "@/constants";

type Scripted = (config: InternalAxiosRequestConfig) => AxiosResponse;

const queue: Scripted[] = [];

const ok = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: "OK",
  headers: {},
  config: config as AxiosResponse["config"],
});

const httpError = (config: InternalAxiosRequestConfig, status: number, message: string) =>
  new AxiosError(message, "ERR_BAD_REQUEST", config, null, {
    data: { success: false, message },
    status,
    statusText: "",
    headers: {},
    config: config as AxiosResponse["config"],
  });

const makeInstance = () => {
  const instance = axios.create({ baseURL: "https://api.test" });
  instance.defaults.adapter = async (config) => {
    const next = queue.shift();
    if (!next) throw new Error("No scripted response left for this request");
    return next(config);
  };
  setupRequestInterceptor(instance);
  setupResponseInterceptor(instance);
  return instance;
};

describe("axios interceptors", () => {
  beforeEach(() => {
    localStorage.clear();
    store.dispatch(logout());
    queue.length = 0;
    // Flush + discard any toasts queued by a previous test
    setToastListener(() => {});
    setToastListener(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("treats HTTP 200 + empty body as rate-limited (API doc §17)", async () => {
    const instance = makeInstance();
    queue.push((config) => ok(config, ""));

    await expect(instance.get("/moment/feed")).rejects.toMatchObject({
      code: "ERR_RATE_LIMITED",
    });
  });

  it("refreshes a single-flight token on 401 and replays with the new token", async () => {
    localStorage.setItem(TOKEN_KEY, "OLD");
    localStorage.setItem(REFRESH_TOKEN_KEY, "REFRESH");
    store.dispatch(
      setCredentials({ user: { id: 1, name: "Tester", email: "t@example.com" }, token: "OLD" }),
    );

    const postSpy = vi.spyOn(axios, "post").mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as AxiosResponse["config"],
      data: {
        success: true,
        data: {
          token: "NEW",
          expiresAt: "2030-01-01T00:00:00Z",
          refreshToken: "REFRESH2",
          refreshTokenExpiresAt: "2030-01-08T00:00:00Z",
        },
      },
    });

    const seenAuth: unknown[] = [];
    queue.push(
      (config) => {
        seenAuth.push(config.headers?.Authorization);
        throw httpError(config, 401, "Unauthorized");
      },
      (config) => {
        seenAuth.push(config.headers?.Authorization);
        return ok(config, { success: true, data: { ok: true } });
      },
    );

    const instance = makeInstance();
    const res = await instance.get("/user/me");

    expect(res.data.data.ok).toBe(true);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(String(postSpy.mock.calls[0][0])).toContain("/Auth/refresh");
    expect(seenAuth).toEqual(["Bearer OLD", "Bearer NEW"]);
    expect(localStorage.getItem(TOKEN_KEY)).toBe("NEW");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("REFRESH2");
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("clears tokens and logs out when the refresh fails", async () => {
    localStorage.setItem(TOKEN_KEY, "OLD");
    localStorage.setItem(REFRESH_TOKEN_KEY, "REFRESH");
    store.dispatch(
      setCredentials({ user: { id: 1, name: "Tester", email: "t@example.com" }, token: "OLD" }),
    );

    vi.spyOn(axios, "post").mockRejectedValue(
      new AxiosError("Refresh request failed", "ERR_BAD_REQUEST"),
    );

    const instance = makeInstance();
    queue.push((config) => {
      throw httpError(config, 401, "Unauthorized");
    });

    await expect(instance.get("/user/me")).rejects.toBeTruthy();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_EXPIRES_AT_KEY)).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it("never refreshes on a credential-endpoint 401 (wrong password)", async () => {
    const postSpy = vi.spyOn(axios, "post");
    const instance = makeInstance();
    queue.push((config) => {
      throw httpError(config, 401, "Sai email hoặc mật khẩu.");
    });

    await expect(instance.post("/Auth/login", {})).rejects.toBeTruthy();
    expect(postSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("routes non-silent errors to the toast bridge", async () => {
    const listener = vi.fn();
    setToastListener(listener);

    const instance = makeInstance();
    queue.push((config) => {
      throw httpError(config, 500, "generic server text");
    });

    await expect(instance.get("/chat")).rejects.toBeTruthy();

    expect(listener).toHaveBeenCalledWith(expect.any(String), "error");
    setToastListener(null);
  });

  it("suppresses the global toast for silent requests", async () => {
    const listener = vi.fn();
    setToastListener(listener);

    const instance = makeInstance();
    queue.push((config) => {
      throw httpError(config, 400, "validation");
    });

    await expect(instance.post("/Auth/register", {}, { silent: true })).rejects.toBeTruthy();
    expect(listener).not.toHaveBeenCalled();
    setToastListener(null);
  });

  it("surfaces the rate-limit message through the toast bridge", async () => {
    const listener = vi.fn();
    setToastListener(listener);

    const instance = makeInstance();
    queue.push((config) => ok(config, ""));

    await expect(instance.post("/Auth/login", {})).rejects.toBeTruthy();
    expect(listener).toHaveBeenCalledWith(expect.stringContaining("Quá nhiều yêu cầu"), "error");
    setToastListener(null);
  });
});
