import type { AxiosError } from "axios";

export interface HandledError {
  message: string;
  status?: number;
  code?: string;
}

/** API doc §17: server text for 404/401/403/500 is deliberately generic —
 *  surface our own localised copy instead. 400 validation and documented 409
 *  conflicts keep the server message verbatim. */
const LOCALIZED: Record<number, string> = {
  401: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy tài nguyên.",
  409: "Trạng thái hiện tại không cho phép thực hiện thao tác này.",
  413: "Tệp tin quá lớn để tải lên.",
  500: "Đã xảy ra lỗi không mong đợi.",
  502: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
  503: "Máy chủ đang bảo trì. Vui lòng thử lại sau.",
  504: "Máy chủ phản hồi quá chậm. Vui lòng thử lại.",
};

const FALLBACK = "Đã xảy ra lỗi không mong đợi.";

export const handleApiError = (error: AxiosError): HandledError => {
  // Synthetic rate-limit rejection (HTTP 200 + empty body, API doc §17) —
  // it carries a purpose-built message instead of an envelope.
  if (error.code === "ERR_RATE_LIMITED") {
    return { message: error.message, code: "ERR_RATE_LIMITED" };
  }

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as { message?: string; code?: string } | undefined;
    const serverMessage = typeof data?.message === "string" ? data.message.trim() : "";

    if (status === 400 || status === 409) {
      return {
        message:
          serverMessage || (status === 400 ? "Dữ liệu đầu vào không hợp lệ." : LOCALIZED[409]),
        status,
        code: data?.code,
      };
    }

    return {
      message: LOCALIZED[status] || serverMessage || FALLBACK,
      status,
      code: data?.code,
    };
  }

  if (error.request) {
    return { message: "Không thể kết nối máy chủ. Vui lòng thử lại.", code: "NETWORK_ERROR" };
  }

  return { message: error.message || FALLBACK, code: "UNKNOWN_ERROR" };
};
