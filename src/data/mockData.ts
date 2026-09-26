import { User, Moment, Conversation, Timeline, DiscoverableGroup } from '../types';

export const CURRENT_USER: User = {
  id: 'user_me',
  name: 'Minh Phong',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  bio: 'Sống trọn từng khoảnh khắc ✨ Yêu công nghệ & nhiếp ảnh.',
  age: 23,
  gender: 'Nam',
  battery: 88,
  isCharging: false,
  status: 'Đang xây dựng FriendHere 🚀',
  lastUpdated: 'Vừa xong',
  location: {
    lat: 21.028511,
    lng: 105.854167,
    address: 'Phố Đinh Tiên Hoàng, Hoàn Kiếm',
    city: 'Hà Nội'
  },
  visibility: 4
};

export const MOCK_FRIENDS: User[] = [
  {
    id: 'user_1',
    name: 'Linh Đan',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    bio: 'Coffee lover ☕ | Architectural photographer',
    age: 22,
    gender: 'Nữ',
    battery: 92,
    isCharging: true,
    status: 'Cafe sáng ven hồ Hoàn Kiếm ☕',
    lastUpdated: '2 phút trước',
    location: {
      lat: 21.0305,
      lng: 105.8522,
      address: 'Đinh Lễ, Tràng Tiền',
      city: 'Hà Nội'
    },
    visibility: 2,
    relationship: {
      type: 'best_friend',
      status: 'accepted'
    },
    distanceKm: 0.35
  },
  {
    id: 'user_2',
    name: 'Thu Hà',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    bio: 'Em bé đáng yêu của anh ❤️',
    age: 23,
    gender: 'Nữ',
    battery: 76,
    isCharging: false,
    status: 'Làm việc tại Lotte Center 🏢',
    lastUpdated: '5 phút trước',
    location: {
      lat: 21.0321,
      lng: 105.8142,
      address: '54 Liễu Giai, Ba Đình',
      city: 'Hà Nội'
    },
    visibility: 3,
    relationship: {
      type: 'lover',
      status: 'accepted'
    },
    distanceKm: 2.1
  },
  {
    id: 'user_3',
    name: 'Hoàng Nam',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'Chạy bộ, gym & khám phá đường phố 🏃‍♂️',
    age: 24,
    gender: 'Nam',
    battery: 42,
    isCharging: false,
    status: 'Tập gym ca chiều 💪',
    lastUpdated: '12 phút trước',
    location: {
      lat: 21.0225,
      lng: 105.8488,
      address: 'Bà Triệu, Hai Bà Trưng',
      city: 'Hà Nội'
    },
    visibility: 1,
    relationship: {
      type: 'friend',
      status: 'accepted'
    },
    distanceKm: 1.1
  },
  {
    id: 'user_4',
    name: 'Đức Anh',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Biker & phượt thủ Tây Bắc 🏍️',
    age: 24,
    gender: 'Nam',
    battery: 15,
    isCharging: false,
    status: 'Đi dạo ngắm hoàng hôn Hồ Tây 🌅',
    lastUpdated: '18 phút trước',
    location: {
      lat: 21.0558,
      lng: 105.8245,
      address: 'Đường Thanh Niên, Tây Hồ',
      city: 'Hà Nội'
    },
    visibility: 4,
    relationship: {
      type: 'friend',
      status: 'accepted'
    },
    distanceKm: 3.4
  },
  {
    id: 'user_5',
    name: 'Mai Phương',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    bio: 'Sách, trà và những ngày mưa 🌧️',
    age: 22,
    gender: 'Nữ',
    battery: 64,
    isCharging: false,
    status: 'Ôn thi ở thư viện ĐHQG 📖',
    lastUpdated: '25 phút trước',
    location: {
      lat: 21.0368,
      lng: 105.7828,
      address: 'Xuân Thủy, Cầu Giấy',
      city: 'Hà Nội'
    },
    visibility: 2,
    relationship: {
      type: 'best_friend',
      status: 'accepted'
    },
    distanceKm: 4.8
  },
  {
    id: 'user_6',
    name: 'Tuấn Kiệt',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
    bio: 'Bạn học thời cấp 3',
    age: 23,
    gender: 'Nam',
    battery: 58,
    status: 'Hôm nay trời đẹp quá!',
    lastUpdated: '1 giờ trước',
    location: {
      lat: 21.0112,
      lng: 105.8344,
      address: 'Xã Đàn, Đống Đa',
      city: 'Hà Nội'
    },
    visibility: 1,
    relationship: {
      type: 'friend',
      status: 'pending_received'
    },
    distanceKm: 2.8
  },
  {
    id: 'user_7',
    name: 'Bảo Ngọc',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Design & Visual Arts 🎨',
    age: 21,
    gender: 'Nữ',
    battery: 81,
    status: 'Workshop vẽ tranh cuối tuần',
    lastUpdated: '3 giờ trước',
    location: {
      lat: 21.0412,
      lng: 105.8411,
      address: 'Yên Phụ, Tây Hồ',
      city: 'Hà Nội'
    },
    visibility: 4,
    relationship: {
      type: 'friend',
      status: 'pending_sent'
    },
    distanceKm: 2.3
  },
  {
    id: 'user_8',
    name: 'Hải Yến',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Nhiếp ảnh & khám phá những quán cafe giấu mình trong ngõ phố ✨',
    age: 21,
    gender: 'Nữ',
    battery: 88,
    isCharging: false,
    status: 'Chụp ảnh phố Tràng Tiền 📸',
    lastUpdated: '1 phút trước',
    location: {
      lat: 21.0255,
      lng: 105.8562,
      address: 'Tràng Tiền, Hoàn Kiếm',
      city: 'Hà Nội'
    },
    visibility: 4,
    relationship: {
      type: 'friend',
      status: 'none'
    },
    distanceKm: 0.45
  },
  {
    id: 'user_9',
    name: 'Minh Quân',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    bio: 'Marathon runner 🏃‍♂️ Yêu chạy bộ sáng & thể thao',
    age: 24,
    gender: 'Nam',
    battery: 65,
    isCharging: false,
    status: 'Chạy bộ quanh Hồ Gươm 🏃',
    lastUpdated: '3 phút trước',
    location: {
      lat: 21.0298,
      lng: 105.8505,
      address: 'Lê Thái Tổ, Hoàn Kiếm',
      city: 'Hà Nội'
    },
    visibility: 4,
    relationship: {
      type: 'friend',
      status: 'none'
    },
    distanceKm: 0.38
  },
  {
    id: 'user_10',
    name: 'Thảo My',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    bio: 'Acoustic guitar & indie music 🎸',
    age: 22,
    gender: 'Nữ',
    battery: 94,
    isCharging: true,
    status: 'Chill acoustic cafe ven hồ 🎵',
    lastUpdated: '5 phút trước',
    location: {
      lat: 21.0542,
      lng: 105.8291,
      address: 'Quảng Khánh, Tây Hồ',
      city: 'Hà Nội'
    },
    visibility: 4,
    relationship: {
      type: 'friend',
      status: 'none'
    },
    distanceKm: 3.1
  },
  {
    id: 'user_11',
    name: 'Quang Huy',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    bio: 'Software engineer & tech enthusiast 💻',
    age: 25,
    gender: 'Nam',
    battery: 52,
    isCharging: false,
    status: 'Làm việc remote cafe Cầu Giấy 💻',
    lastUpdated: '8 phút trước',
    location: {
      lat: 21.0345,
      lng: 105.7915,
      address: 'Dịch Vọng Hậu, Cầu Giấy',
      city: 'Hà Nội'
    },
    visibility: 4,
    relationship: {
      type: 'friend',
      status: 'none'
    },
    distanceKm: 4.2
  },
  {
    id: 'user_12',
    name: 'Hoàng Bách',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    bio: 'Food review & ẩm thực đêm phố cổ 🍜',
    age: 23,
    gender: 'Nam',
    battery: 73,
    isCharging: false,
    status: 'Ăn tối phố ẩm thực Tống Duy Tân 🍜',
    lastUpdated: '12 phút trước',
    location: {
      lat: 21.0278,
      lng: 105.8440,
      address: 'Tống Duy Tân, Hoàn Kiếm',
      city: 'Hà Nội'
    },
    visibility: 4,
    relationship: {
      type: 'friend',
      status: 'none'
    },
    distanceKm: 0.8
  }
];

export const MOCK_MOMENTS: Moment[] = [
  {
    id: 'moment_1',
    userId: 'user_1',
    userName: 'Linh Đan',
    userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
    ],
    mediaType: 'image',
    caption: 'Góc cafe quen thuộc mỗi sáng cuối tuần. Cà phê trứng thơm ngậy và ngắm phố phường lên đèn sớm ✨☕',
    locationName: 'Đinh Lễ, Hoàn Kiếm, Hà Nội',
    includeLocation: true,
    allowDirectMessage: true,
    timeAgo: '15 phút trước',
    createdAt: '2026-09-25T18:45:00Z',
    visibility: 2,
    allowComment: true,
    reactions: [
      { userId: 'user_me', userName: 'Minh Phong', userAvatar: CURRENT_USER.avatar, emoji: '❤️' },
      { userId: 'user_3', userName: 'Hoàng Nam', userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', emoji: '👍' },
      { userId: 'user_2', userName: 'Thu Hà', userAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80', emoji: '❤️' }
    ],
    timelineId: 'timeline_hanoi'
  },
  {
    id: 'moment_video_1',
    userId: 'user_3',
    userName: 'Hoàng Nam',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    mediaType: 'video',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    caption: 'Chạy bộ hoàng hôn quanh Hồ Gươm 🏃‍♂️💨 Không khí hôm nay siêu mát mẻ, anh em lên đồ thôi!',
    locationName: 'Bờ Hồ Hoàn Kiếm, Hà Nội',
    includeLocation: true,
    allowDirectMessage: true,
    timeAgo: '45 phút trước',
    createdAt: '2026-09-25T18:15:00Z',
    visibility: 4,
    allowComment: true,
    reactions: [
      { userId: 'user_1', userName: 'Linh Đan', userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', emoji: '❤️' },
      { userId: 'user_me', userName: 'Minh Phong', userAvatar: CURRENT_USER.avatar, emoji: '👍' }
    ]
  },
  {
    id: 'moment_2',
    userId: 'user_2',
    userName: 'Thu Hà',
    userAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
    ],
    mediaType: 'image',
    caption: 'Bó hoa cúc tana xinh xắn được tặng giữa ngày bận rộn 🌼 Cảm ơn anh yêuuu!',
    locationName: 'Lotte Center Ba Đình',
    includeLocation: true,
    allowDirectMessage: true,
    timeAgo: '1 giờ trước',
    createdAt: '2026-09-25T17:30:00Z',
    visibility: 3,
    allowComment: true,
    reactions: [
      { userId: 'user_me', userName: 'Minh Phong', userAvatar: CURRENT_USER.avatar, emoji: '❤️' },
      { userId: 'user_1', userName: 'Linh Đan', userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', emoji: '😮' }
    ]
  },
  {
    id: 'moment_3',
    userId: 'user_4',
    userName: 'Đức Anh',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    mediaType: 'video',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    caption: 'Gió mùa về mát rượi bên bờ Hồ Tây. Ai ra làm cốc trà chanh hướng dương không? 🛵💨',
    locationName: 'Đường Thanh Niên, Tây Hồ',
    includeLocation: true,
    allowDirectMessage: true,
    timeAgo: '2 giờ trước',
    createdAt: '2026-09-25T16:15:00Z',
    visibility: 4,
    allowComment: true,
    reactions: [
      { userId: 'user_3', userName: 'Hoàng Nam', userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', emoji: '👍' },
      { userId: 'user_me', userName: 'Minh Phong', userAvatar: CURRENT_USER.avatar, emoji: '😂' }
    ]
  },
  {
    id: 'moment_4',
    userId: 'user_me',
    userName: 'Minh Phong',
    userAvatar: CURRENT_USER.avatar,
    imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=800&q=80'
    ],
    mediaType: 'image',
    caption: 'Đang hoàn thiện diện mạo mới cho app FriendHere: nền trắng tinh tế, bottom nav chuẩn app mobile, mượt mà từng điểm chạm! 💻✨',
    locationName: 'Hoàn Kiếm, Hà Nội',
    includeLocation: false,
    allowDirectMessage: true,
    timeAgo: '3 giờ trước',
    createdAt: '2026-09-25T15:00:00Z',
    visibility: 4,
    allowComment: true,
    reactions: [
      { userId: 'user_1', userName: 'Linh Đan', userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', emoji: '❤️' },
      { userId: 'user_2', userName: 'Thu Hà', userAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80', emoji: '❤️' },
      { userId: 'user_3', userName: 'Hoàng Nam', userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', emoji: '👍' }
    ]
  }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1',
    isGroup: false,
    participants: [
      CURRENT_USER,
      MOCK_FRIENDS.find(f => f.id === 'user_1')!
    ],
    lastMessage: {
      id: 'msg_1_last',
      senderId: 'user_1',
      text: 'Chiều nay 3h qua Đinh Lễ cafe nha Phong ơi! ☕',
      timestamp: '14:20',
      status: 'read'
    },
    unreadCount: 2,
    isPinned: true
  },
  {
    id: 'conv_2',
    isGroup: false,
    participants: [
      CURRENT_USER,
      MOCK_FRIENDS.find(f => f.id === 'user_2')!
    ],
    lastMessage: {
      id: 'msg_2_last',
      senderId: 'user_2',
      text: 'Tối nay đi ăn lẩu nướng cùng em nhé ❤️',
      timestamp: '12:45',
      status: 'read'
    },
    unreadCount: 1,
    isPinned: true
  },
  {
    id: 'conv_group_1',
    isGroup: true,
    name: 'Hội bạn thân Hà Nội 🌟',
    avatar: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80',
    participants: [
      CURRENT_USER,
      MOCK_FRIENDS.find(f => f.id === 'user_1')!,
      MOCK_FRIENDS.find(f => f.id === 'user_3')!,
      MOCK_FRIENDS.find(f => f.id === 'user_5')!
    ],
    lastMessage: {
      id: 'msg_g1_last',
      senderId: 'user_3',
      text: 'Cuối tuần này lên kèo đi cắm trại Ba Vì không cả nhà?',
      timestamp: '11:15',
      status: 'delivered'
    },
    unreadCount: 0,
    isPinned: false,
    adminId: 'user_me',
    pendingRequests: [
      {
        id: 'user_req_1',
        name: 'Trần Bảo Ngọc',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        bio: 'Thích du lịch, camping cuối tuần 🏕️',
        age: 22,
        gender: 'Nữ',
        location: { lat: 21.035, lng: 105.845, address: 'Tây Hồ, Hà Nội', city: 'Hà Nội' },
        status: 'Đang tìm bạn đi Ba Vì ☕',
        battery: 90,
        isCharging: false,
        visibility: 4,
        lastUpdated: '10 phút trước'
      }
    ]
  },
  {
    id: 'conv_3',
    isGroup: false,
    participants: [
      CURRENT_USER,
      MOCK_FRIENDS.find(f => f.id === 'user_4')!
    ],
    lastMessage: {
      id: 'msg_3_last',
      senderId: 'user_me',
      text: 'Okie ông, tầm 5h tôi ra Hồ Tây nhé!',
      timestamp: 'Hôm qua',
      status: 'read'
    },
    unreadCount: 0,
    isPinned: false,
    isArchived: true
  }
];

export const MOCK_MESSAGES_DATA: Record<string, import('../types').Message[]> = {
  conv_1: [
    {
      id: 'm1_1',
      senderId: 'user_1',
      text: 'Chào Phong! Sáng nay trời se lạnh thích ghê.',
      timestamp: '10:02',
      status: 'read'
    },
    {
      id: 'm1_2',
      senderId: 'user_me',
      text: 'Đúng rồi Linh Đan, sáng ra hồ Hoàn Kiếm không khí trong lành lắm.',
      timestamp: '10:04',
      status: 'read'
    },
    {
      id: 'm1_3',
      senderId: 'user_1',
      text: 'Tớ vừa chụp được mấy góc quán cafe Đinh Lễ xinh lắm, tí tớ gửi qua cho xem nè!',
      timestamp: '10:05',
      status: 'read',
      reactions: [{ userId: 'user_me', emoji: '❤️' }]
    },
    {
      id: 'm1_4',
      senderId: 'user_1',
      imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
      timestamp: '10:06',
      status: 'read'
    },
    {
      id: 'm1_5',
      senderId: 'user_me',
      text: 'Góc này ánh sáng đẹp quá! 📸 Chiều rảnh không?',
      timestamp: '10:08',
      status: 'read'
    },
    {
      id: 'm1_6',
      senderId: 'user_1',
      text: 'Chiều nay 3h qua Đinh Lễ cafe nha Phong ơi! ☕',
      timestamp: '14:20',
      status: 'read'
    },
    {
      id: 'm1_moment',
      senderId: 'user_1',
      text: 'Tớ vừa đăng khoảnh khắc sáng nay ở Đinh Lễ nè, vào xem thử nhé! ✨',
      momentId: 'moment_1',
      timestamp: '14:22',
      status: 'read'
    }
  ],
  conv_2: [
    {
      id: 'm2_1',
      senderId: 'user_me',
      text: 'Bé con dậy chưa? Nay đi làm có lạnh không em? ❤️',
      timestamp: '08:15',
      status: 'read'
    },
    {
      id: 'm2_2',
      senderId: 'user_2',
      text: 'Em đến văn phòng rồi nè anh. Hơi lạnh xíu nhưng mặc áo ấm rồi ạ 🥰',
      timestamp: '08:30',
      status: 'read'
    },
    {
      id: 'm2_3',
      senderId: 'user_me',
      text: 'Ngoan lắm. Nhớ ăn sáng đầy đủ nha.',
      timestamp: '08:32',
      status: 'read'
    },
    {
      id: 'm2_4',
      senderId: 'user_2',
      text: 'Tối nay đi ăn lẩu nướng cùng em nhé ❤️',
      timestamp: '12:45',
      status: 'read'
    }
  ],
  conv_group_1: [
    {
      id: 'mg_1',
      senderId: 'user_5',
      text: 'Mọi người ơi tuần này ôn thi xong chưa?',
      timestamp: '09:00',
      status: 'read'
    },
    {
      id: 'mg_2',
      senderId: 'user_1',
      text: 'Tớ xong từ hôm qua rồi, đang xõa nè haha 🎉',
      timestamp: '09:12',
      status: 'read'
    },
    {
      id: 'mg_3',
      senderId: 'user_3',
      text: 'Cuối tuần này lên kèo đi cắm trại Ba Vì không cả nhà?',
      timestamp: '11:15',
      status: 'delivered'
    }
  ],
  conv_3: [
    {
      id: 'm3_1',
      senderId: 'user_4',
      text: 'Hôm nay rảnh không ông ơi, làm vòng Hồ Tây hóng gió!',
      timestamp: 'Hôm qua 16:30',
      status: 'read'
    },
    {
      id: 'm3_2',
      senderId: 'user_me',
      text: 'Okie ông, tầm 5h tôi ra Hồ Tây nhé!',
      timestamp: 'Hôm qua 16:45',
      status: 'read'
    }
  ]
};

export const MOCK_TIMELINES: Timeline[] = [
  {
    id: 'timeline_dalat',
    title: 'Hành trình Đà Lạt mùa sương 🌲',
    description: '4 ngày 3 đêm săn mây, khám phá đồi thông và thưởng thức sữa đậu nành nóng hổi cùng hội bạn thân.',
    bannerImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    startDate: '12/03/2026',
    endDate: '15/03/2026',
    ownerId: 'user_me',
    ownerName: 'Minh Phong',
    ownerAvatar: CURRENT_USER.avatar,
    partners: [
      { id: 'user_1', name: 'Linh Đan', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
      { id: 'user_3', name: 'Hoàng Nam', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' }
    ],
    moments: [
      {
        id: 'tl_m1',
        title: 'Đáp sân bay Liên Khương ✈️',
        caption: 'Cơn gió lạnh 16 độ đầu tiên ùa vào mặt khi vừa bước xuống máy bay. Hành trình bắt đầu!',
        imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80',
        locationName: 'Sân bay Liên Khương, Đức Trọng',
        time: '08:30 · Ngày 1',
        dayNumber: 1
      },
      {
        id: 'tl_m2',
        title: 'Săn mây tại Đồi Đa Phú ☁️',
        caption: 'Dậy từ 4h30 sáng leo lên đỉnh đồi. Biển mây bồng bềnh cuộn tràn dưới thung lũng, đẹp ngỡ ngàng.',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        locationName: 'Đồi Đa Phú, P. 7, Đà Lạt',
        time: '05:45 · Ngày 2',
        dayNumber: 2
      },
      {
        id: 'tl_m3',
        title: 'Cafe hoàng hôn xóm Lèo 🌅',
        caption: 'Nhâm nhi tách trà nóng, ngắm nhìn thung lũng đèn lồng lung linh khi màn đêm buông xuống.',
        imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
        locationName: 'Xóm Lèo, Huỳnh Tấn Phát',
        time: '17:30 · Ngày 3',
        dayNumber: 3
      },
      {
        id: 'tl_m4',
        title: 'Chợ đêm & Bánh tráng nướng 🌯',
        caption: 'Bữa tiệc ẩm thực đường phố ấm cúng trước khi tạm biệt thành phố ngàn hoa.',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        locationName: 'Chợ đêm Đà Lạt',
        time: '20:15 · Ngày 4',
        dayNumber: 4
      }
    ]
  },
  {
    id: 'timeline_hanoi',
    title: 'Weekend Food Tour Hà Nội 🍲',
    description: 'Khám phá 36 phố phường qua hương vị phở bò gia truyền, bún chả que tre và cafe trứng Bát Đàn.',
    bannerImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    startDate: '20/09/2026',
    endDate: '21/09/2026',
    ownerId: 'user_1',
    ownerName: 'Linh Đan',
    ownerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    partners: [
      { id: 'user_me', name: 'Minh Phong', avatar: CURRENT_USER.avatar },
      { id: 'user_2', name: 'Thu Hà', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80' }
    ],
    moments: [
      {
        id: 'tl_h1',
        title: 'Phở bò tái lăn Lò Đúc 🍜',
        caption: 'Hương thơm nức mũi của thịt bò xào lăn cùng hành lá phủ kín bát phở.',
        imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80',
        locationName: 'Phố Lò Đúc, Hai Bà Trưng',
        time: '07:30 · Ngày 1',
        dayNumber: 1
      },
      {
        id: 'tl_h2',
        title: 'Cafe Trứng Giảng phố cổ ☕',
        caption: 'Vị béo ngậy của kem trứng quyện với vị đắng đậm đà của cà phê robusta nguyên chất.',
        imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
        locationName: 'Nguyễn Hữu Huân, Hoàn Kiếm',
        time: '15:00 · Ngày 2',
        dayNumber: 2
      }
    ]
  }
];

export const VISIBILITY_OPTIONS = [
  { value: 0, label: 'Chỉ mình tôi', desc: 'Ẩn hoàn toàn vị trí khỏi bản đồ', icon: 'Lock' },
  { value: 1, label: 'Bạn bè', desc: 'Chỉ bạn bè trong danh bạ mới nhìn thấy', icon: 'Users' },
  { value: 2, label: 'Bạn thân', desc: 'Chỉ danh sách Bạn thân xem được', icon: 'Star' },
  { value: 3, label: 'Người yêu', desc: 'Chỉ chia sẻ riêng cho đối phương', icon: 'Heart' },
  { value: 4, label: 'Công khai', desc: 'Mọi người quanh khu vực đều thấy', icon: 'Globe' }
];

export const DISCOVERABLE_GROUPS: DiscoverableGroup[] = [
  {
    id: 'disc_grp_1',
    name: 'Hội Phượt & Khám Phá Tây Bắc 🏕️',
    description: 'Chia sẻ các cung đường đèo hiểm trở, kinh nghiệm săn mây Tà Xùa và homestay view đẹp.',
    avatar: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80',
    category: 'Du lịch & Trải nghiệm',
    isPrivate: false,
    memberCount: 254,
    activityTime: 'Hoạt động 5 phút trước'
  },
  {
    id: 'disc_grp_2',
    name: 'CLB Nhiếp Ảnh & Film Hà Nội 📸',
    description: 'Hội tụ những bạn trẻ yêu thích máy film, chụp ảnh streetlife phố cổ và tone màu hoài niệm.',
    avatar: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80',
    category: 'Nghệ thuật & Đời sống',
    isPrivate: false,
    memberCount: 182,
    activityTime: 'Hoạt động 15 phút trước'
  },
  {
    id: 'disc_grp_3',
    name: 'Cộng Đồng Sinh Viên Bách - Kinh - Xây 🎓',
    description: 'Kênh kết nối học tập, tìm phòng trọ, review đồ ăn quanh khu vực Bách Khoa - NEU.',
    avatar: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=80',
    category: 'Học tập & Giao lưu',
    isPrivate: true,
    memberCount: 420,
    activityTime: 'Hoạt động 30 phút trước'
  },
  {
    id: 'disc_grp_4',
    name: 'Hội Corgi & Boss Mèo Hà Nội 🐾',
    description: 'Giao lưu kinh nghiệm nuôi thú cưng, lịch tiêm phòng, dinh dưỡng và offline dạo công viên.',
    avatar: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80',
    category: 'Thú cưng & Động vật',
    isPrivate: true,
    memberCount: 115,
    activityTime: 'Hoạt động 1 giờ trước'
  },
  {
    id: 'disc_grp_5',
    name: 'Team Runner Hồ Gươm & Hồ Tây 🏃‍♂️',
    description: 'Lên kèo chạy bộ đón bình minh và hoàng hôn mỗi ngày. Rèn luyện sức khỏe bền bỉ.',
    avatar: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=400&q=80',
    category: 'Thể thao & Sức khỏe',
    isPrivate: false,
    memberCount: 96,
    activityTime: 'Hoạt động 2 giờ trước'
  },
  {
    id: 'disc_grp_6',
    name: 'Hội Review Ẩm Thực Phố Cổ 🍜',
    description: 'Săn lùng quán ăn đêm ngon - bổ - rẻ, cà phê trứng, phở gánh và bún ốc cổ truyền.',
    avatar: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
    category: 'Ẩm thực & Ẩn số ngon',
    isPrivate: false,
    memberCount: 310,
    activityTime: 'Hoạt động 3 giờ trước'
  }
];
