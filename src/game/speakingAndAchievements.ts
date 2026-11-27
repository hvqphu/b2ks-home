import {
  AchievementDef,
  AchievementId,
  Member,
  RobotSkinId,
  SpeakingBankQuestion,
  SpeakingLevel,
  TaskItem,
} from '../types/b2ks';

export const SPEAKING_BANK_VERSION = 1;

export const ROBOT_SKIN_OPTIONS: Array<{
  id: RobotSkinId;
  name: string;
  icon: string;
  badgeColor: string;
  desc: string;
}> = [
  {
    id: 'doraemon',
    name: 'Robot Mèo Máy (Doraemon)',
    icon: '🐱',
    badgeColor: '#0284C7',
    desc: 'Tròn trĩnh xanh dương, chuông vàng & túi thần kỳ trước bụng',
  },
  {
    id: 'doraemi',
    name: 'Robot Mèo Vàng (Doraemi)',
    icon: '🎀',
    badgeColor: '#EAB308',
    desc: 'Màu vàng tươi đáng yêu, nơ đỏ lớn trên đầu, chuông vàng & túi thần kỳ',
  },
  {
    id: 'gundam',
    name: 'Robot Chiến Binh (Gundam)',
    icon: '🤖',
    badgeColor: '#2563EB',
    desc: 'Giáp V-Fin trắng xanh đỏ mạnh mẽ, vai giáp cánh phản lực',
  },
  {
    id: 'walle',
    name: 'Robot Thám Hiểm (WALL-E)',
    icon: '🦾',
    badgeColor: '#D97706',
    desc: 'Thân khối vàng đất thân thiện, đôi mắt ống nhòm đáng yêu',
  },
];

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  {
    id: 'first_task',
    title: 'Khởi Đầu Chăm Chỉ',
    description: 'Hoàn thành nhiệm vụ đầu tiên (1st Task)',
    icon: '🌟',
    category: 'tasks',
    color: '#F59E0B',
    target: 1,
  },
  {
    id: 'tasks_10',
    title: 'Chiến Binh Chăm Chỉ',
    description: 'Hoàn thành tổng cộng 10 nhiệm vụ',
    icon: '🧹',
    category: 'tasks',
    color: '#10B981',
    target: 10,
  },
  {
    id: 'tasks_50',
    title: 'Siêu Sao Nhiệm Vụ',
    description: 'Hoàn thành tổng cộng 50 nhiệm vụ',
    icon: '🏅',
    category: 'tasks',
    color: '#2563EB',
    target: 50,
  },
  {
    id: 'tasks_100',
    title: 'Huyền Thoại Gia Đình',
    description: 'Hoàn thành tổng cộng 100 nhiệm vụ',
    icon: '👑',
    category: 'tasks',
    color: '#7C3AED',
    target: 100,
  },
  {
    id: 'eng_words_50',
    title: 'Nhà Sưu Tầm Từ Vựng',
    description: 'Sử dụng 50 từ tiếng Anh khác nhau',
    icon: '🔤',
    category: 'english',
    color: '#0EA5E9',
    target: 50,
  },
  {
    id: 'eng_words_200',
    title: 'Học Giả Song Ngữ',
    description: 'Sử dụng 200 từ tiếng Anh khác nhau',
    icon: '📘',
    category: 'english',
    color: '#4F46E5',
    target: 200,
  },
  {
    id: 'eng_words_500',
    title: 'Bậc Thầy Ngôn Ngữ',
    description: 'Sử dụng 500 từ tiếng Anh khác nhau',
    icon: '🎓',
    category: 'english',
    color: '#DB2777',
    target: 500,
  },
  {
    id: 'eng_quiz_perfect',
    title: 'Điểm 10 Hoàn Hảo',
    description: 'Đạt điểm tuyệt đối 10/10 trong bài kiểm tra Tiếng Anh',
    icon: '💯',
    category: 'english',
    color: '#E11D48',
    target: 1,
  },
  {
    id: 'eng_quiz_10',
    title: 'Học Sinh Chăm Chỉ',
    description: 'Hoàn thành 10 lượt bài tập tại Trung Tâm Tiếng Anh',
    icon: '✏️',
    category: 'english',
    color: '#0D9488',
    target: 10,
  },
  {
    id: 'speak_first',
    title: 'Lời Chào Đầu Tiên',
    description: 'Giao tiếp với người nước ngoài đạt >= 80% lần đầu',
    icon: '🗣️',
    category: 'english',
    color: '#0284C7',
    target: 1,
  },
  {
    id: 'speak_95',
    title: 'Phát Âm Chuẩn Xác',
    description: 'Đạt độ chính xác phát âm >= 95% với bạn nước ngoài',
    icon: '🎙️',
    category: 'english',
    color: '#16A34A',
    target: 1,
  },
  {
    id: 'speak_lv3',
    title: 'Giao Tiếp Tự Tin',
    description: 'Thăng hạng đạt Speaking Level 3',
    icon: '🌍',
    category: 'english',
    color: '#EA580C',
    target: 3,
  },
  {
    id: 'speak_lv5',
    title: 'Sứ Giả Tiếng Anh',
    description: 'Chinh phục Speaking Level 5 (cấp độ cao nhất)',
    icon: '🏆',
    category: 'english',
    color: '#CA8A04',
    target: 5,
  },
  {
    id: 'comic_5',
    title: 'Mọt Sách Tiếng Anh',
    description: 'Đọc hoàn thành 5 cuốn truyện tranh Tiếng Anh',
    icon: '📚',
    category: 'world',
    color: '#9333EA',
    target: 5,
  },
  {
    id: 'pet_first',
    title: 'Người Bạn Thú Cưng',
    description: 'Ấp nở thành công thú cưng đầu tiên',
    icon: '🐾',
    category: 'world',
    color: '#F97316',
    target: 1,
  },
  {
    id: 'zoo_10',
    title: 'Nhà Khám Phá Sở Thú',
    description: 'Mở khóa 10 loài động vật trong Sở Thú Ảo',
    icon: '🦁',
    category: 'world',
    color: '#059669',
    target: 10,
  },
];

export const DEFAULT_SPEAKING_BANK: SpeakingBankQuestion[] = [
  // ================= LEVEL 1: Basic Greetings & Daily Life =================
  { id: 'spk_1_01', level: 1, topic: 'Greetings', sentence: 'Hello, nice to meet you today.', meaningVi: 'Xin chào, rất vui được gặp bạn hôm nay.' },
  { id: 'spk_1_02', level: 1, topic: 'Greetings', sentence: 'Good morning, how are you doing?', meaningVi: 'Chào buổi sáng, bạn có khỏe không?' },
  { id: 'spk_1_03', level: 1, topic: 'Greetings', sentence: 'I am very happy to see you.', meaningVi: 'Mình rất vui khi được gặp bạn.' },
  { id: 'spk_1_04', level: 1, topic: 'Introduction', sentence: 'My name is Anna and I live here.', meaningVi: 'Tên mình là Anna và mình sống ở đây.' },
  { id: 'spk_1_05', level: 1, topic: 'Daily Life', sentence: 'The weather is sunny and warm today.', meaningVi: 'Thời tiết hôm nay có nắng và ấm áp.' },
  { id: 'spk_1_06', level: 1, topic: 'Daily Life', sentence: 'I like playing football in the park.', meaningVi: 'Mình thích chơi bóng đá ở công viên.' },
  { id: 'spk_1_07', level: 1, topic: 'Family', sentence: 'I love my family very much.', meaningVi: 'Mình yêu gia đình của mình rất nhiều.' },
  { id: 'spk_1_08', level: 1, topic: 'School', sentence: 'This is my favorite English book.', meaningVi: 'Đây là quyển sách tiếng Anh yêu thích của mình.' },
  { id: 'spk_1_09', level: 1, topic: 'Pets', sentence: 'My cute puppy likes to eat snacks.', meaningVi: 'Chú cún dễ thương của mình thích ăn đồ ăn vặt.' },
  { id: 'spk_1_10', level: 1, topic: 'Food', sentence: 'I drink a glass of fresh milk.', meaningVi: 'Mình uống một ly sữa tươi.' },
  { id: 'spk_1_11', level: 1, topic: 'Colors', sentence: 'Look at the big blue sky above.', meaningVi: 'Hãy nhìn bầu trời xanh rộng lớn ở trên cao.' },
  { id: 'spk_1_12', level: 1, topic: 'Polite', sentence: 'Thank you so much for your help.', meaningVi: 'Cảm ơn bạn rất nhiều vì sự giúp đỡ.' },
  { id: 'spk_1_13', level: 1, topic: 'Home', sentence: 'My bedroom is clean and tidy now.', meaningVi: 'Phòng ngủ của mình bây giờ sạch sẽ và gọn gàng.' },
  { id: 'spk_1_14', level: 1, topic: 'Friends', sentence: 'We are best friends in this town.', meaningVi: 'Chúng ta là những người bạn thân nhất ở thị trấn này.' },
  { id: 'spk_1_15', level: 1, topic: 'Hobbies', sentence: 'I like drawing colorful flowers and trees.', meaningVi: 'Mình thích vẽ hoa và cây nhiều màu sắc.' },
  { id: 'spk_1_16', level: 1, topic: 'Greetings', sentence: 'See you again tomorrow morning, friend.', meaningVi: 'Hẹn gặp lại bạn vào sáng mai nhé, bạn ơi.' },

  // ================= LEVEL 2: Routines, Home & Neighborhood =================
  { id: 'spk_2_01', level: 2, topic: 'Routines', sentence: 'I brush my teeth after eating breakfast.', meaningVi: 'Mình đánh răng sau khi ăn bữa sáng.' },
  { id: 'spk_2_02', level: 2, topic: 'Routines', sentence: 'Every morning I wake up at six.', meaningVi: 'Mỗi buổi sáng mình thức dậy lúc sáu giờ.' },
  { id: 'spk_2_03', level: 2, topic: 'Chores', sentence: 'I always help my parents clean the floor.', meaningVi: 'Mình luôn giúp bố mẹ lau dọn sàn nhà.' },
  { id: 'spk_2_04', level: 2, topic: 'Neighborhood', sentence: 'There is a supermarket next to the street.', meaningVi: 'Có một siêu thị ở ngay bên cạnh con đường.' },
  { id: 'spk_2_05', level: 2, topic: 'School', sentence: 'My English teacher is kind and funny.', meaningVi: 'Cô giáo tiếng Anh của mình rất tốt bụng và vui tính.' },
  { id: 'spk_2_06', level: 2, topic: 'Hobbies', sentence: 'On Sundays I enjoy reading comic stories.', meaningVi: 'Vào Chủ nhật mình thích đọc truyện tranh.' },
  { id: 'spk_2_07', level: 2, topic: 'Food', sentence: 'My mom cooks delicious noodles for dinner.', meaningVi: 'Mẹ mình nấu món mì thật ngon cho bữa tối.' },
  { id: 'spk_2_08', level: 2, topic: 'Animals', sentence: 'We can see giraffes and lions at the zoo.', meaningVi: 'Chúng ta có thể thấy hươu cao cổ và sư tử ở sở thú.' },
  { id: 'spk_2_09', level: 2, topic: 'Weather', sentence: 'Take an umbrella because it might rain.', meaningVi: 'Hãy mang theo ô vì trời có thể sẽ mưa.' },
  { id: 'spk_2_10', level: 2, topic: 'Direction', sentence: 'Walk straight ahead and turn left here.', meaningVi: 'Đi thẳng về phía trước rồi rẽ trái ở đây.' },
  { id: 'spk_2_11', level: 2, topic: 'Sports', sentence: 'Swimming in summer keeps my body strong.', meaningVi: 'Bơi lội vào mùa hè giúp cơ thể mình khỏe mạnh.' },
  { id: 'spk_2_12', level: 2, topic: 'Music', sentence: 'She plays the piano in the living room.', meaningVi: 'Cô ấy chơi đàn piano ở trong phòng khách.' },
  { id: 'spk_2_13', level: 2, topic: 'Shopping', sentence: 'How many stars does this cute hat cost?', meaningVi: 'Chiếc mũ dễ thương này có giá bao nhiêu sao?' },
  { id: 'spk_2_14', level: 2, topic: 'Time', sentence: 'We usually finish our homework before eight.', meaningVi: 'Chúng mình thường làm xong bài tập trước tám giờ.' },
  { id: 'spk_2_15', level: 2, topic: 'Nature', sentence: 'Green trees give us fresh air every day.', meaningVi: 'Cây xanh mang lại cho chúng ta không khí trong lành mỗi ngày.' },
  { id: 'spk_2_16', level: 2, topic: 'Pets', sentence: 'Do not forget to feed your little cat.', meaningVi: 'Đừng quên cho chú mèo nhỏ của bạn ăn nhé.' },

  // ================= LEVEL 3: Descriptions, Travel & Stories =================
  { id: 'spk_3_01', level: 3, topic: 'Neighborhood', sentence: 'Our neighborhood looks lively with colorful trees and bright lamps.', meaningVi: 'Khu phố của chúng mình trông thật sinh động với cây cối rực rỡ và đèn đường sáng.' },
  { id: 'spk_3_02', level: 3, topic: 'Learning', sentence: 'Practicing English every single day makes me feel more confident.', meaningVi: 'Luyện tập tiếng Anh mỗi ngày khiến mình cảm thấy tự tin hơn.' },
  { id: 'spk_3_03', level: 3, topic: 'Teamwork', sentence: 'Working together with my sister helps us finish chores quickly.', meaningVi: 'Làm việc cùng chị em giúp chúng mình hoàn thành việc nhà thật nhanh.' },
  { id: 'spk_3_04', level: 3, topic: 'Science', sentence: 'I visited the invention lab to build a shiny spaceship.', meaningVi: 'Mình đã ghé phòng thí nghiệm để chế tạo một con tàu vũ trụ lấp lánh.' },
  { id: 'spk_3_05', level: 3, topic: 'Travel', sentence: 'Last weekend my family went camping near a peaceful river.', meaningVi: 'Cuối tuần trước gia đình mình đã đi cắm trại gần một dòng sông yên bình.' },
  { id: 'spk_3_06', level: 3, topic: 'Health', sentence: 'Eating fresh vegetables and drinking enough water keeps us healthy.', meaningVi: 'Ăn rau tươi và uống đủ nước giúp chúng ta luôn khỏe mạnh.' },
  { id: 'spk_3_07', level: 3, topic: 'Culture', sentence: 'People from different countries speak many interesting languages.', meaningVi: 'Mọi người từ các quốc gia khác nhau nói nhiều ngôn ngữ thú vị.' },
  { id: 'spk_3_08', level: 3, topic: 'School', sentence: 'My favorite subject at school is science because we do experiments.', meaningVi: 'Môn học yêu thích ở trường của mình là khoa học vì chúng mình được làm thí nghiệm.' },
  { id: 'spk_3_09', level: 3, topic: 'Dreams', sentence: 'When I grow up I want to design smart helper robots.', meaningVi: 'Khi lớn lên mình muốn thiết kế những chú robot trợ lý thông minh.' },
  { id: 'spk_3_10', level: 3, topic: 'Kindness', sentence: 'Sharing toys and smiling at neighbors brings joy to everyone.', meaningVi: 'Chia sẻ đồ chơi và mỉm cười với hàng xóm mang lại niềm vui cho mọi người.' },
  { id: 'spk_3_11', level: 3, topic: 'Festivals', sentence: 'During Lunar New Year our house is decorated with yellow blossoms.', meaningVi: 'Vào dịp Tết Nguyên Đán nhà mình được trang trí bằng hoa mai vàng.' },
  { id: 'spk_3_12', level: 3, topic: 'Technology', sentence: 'Modern tablets can help students learn new vocabulary faster.', meaningVi: 'Máy tính bảng hiện đại có thể giúp học sinh học từ vựng mới nhanh hơn.' },
  { id: 'spk_3_13', level: 3, topic: 'Environment', sentence: 'Remember to turn off the lights before leaving your room.', meaningVi: 'Hãy nhớ tắt đèn trước khi rời khỏi phòng của bạn nhé.' },
  { id: 'spk_3_14', level: 3, topic: 'Reading', sentence: 'Reading adventure stories before bedtime sparks my imagination.', meaningVi: 'Đọc truyện phiêu lưu trước giờ đi ngủ khơi gợi trí tưởng tượng của mình.' },
  { id: 'spk_3_15', level: 3, topic: 'Sports', sentence: 'Even when we lose a match, we always cheer for good sportsmanship.', meaningVi: 'Ngay cả khi thua một trận đấu, chúng mình vẫn cổ vũ tinh thần thể thao đẹp.' },
  { id: 'spk_3_16', level: 3, topic: 'Friends', sentence: 'Excuse me, could you tell me the way to the English center?', meaningVi: 'Xin lỗi, bạn có thể chỉ cho mình đường tới Trung tâm Tiếng Anh được không?' },

  // ================= LEVEL 4: Opinions, Planning & Explanations =================
  { id: 'spk_4_01', level: 4, topic: 'Planning', sentence: 'If I finish my homework early tonight, I will visit the virtual zoo.', meaningVi: 'Nếu tối nay mình làm xong bài tập sớm, mình sẽ đi thăm sở thú ảo.' },
  { id: 'spk_4_02', level: 4, topic: 'Opinions', sentence: 'I believe learning to speak fluently is just as important as writing.', meaningVi: 'Mình tin rằng học nói trôi chảy cũng quan trọng ngang với kỹ năng viết.' },
  { id: 'spk_4_03', level: 4, topic: 'Environment', sentence: 'Planting more trees along the sidewalks reduces heat during sunny afternoons.', meaningVi: 'Trồng thêm cây dọc theo vỉa hè giúp giảm nhiệt độ vào những buổi chiều nắng.' },
  { id: 'spk_4_04', level: 4, topic: 'Responsibility', sentence: 'Completing every task before the deadline earns us full star rewards.', meaningVi: 'Hoàn thành mọi nhiệm vụ trước hạn chót giúp chúng ta nhận trọn vẹn điểm thưởng.' },
  { id: 'spk_4_05', level: 4, topic: 'Pets', sentence: 'Taking care of a pet teaches children patience and responsibility every day.', meaningVi: 'Việc chăm sóc thú cưng dạy cho trẻ em tính kiên nhẫn và trách nhiệm mỗi ngày.' },
  { id: 'spk_4_06', level: 4, topic: 'Conversation', sentence: 'Would you mind repeating that sentence a little more slowly for me?', meaningVi: 'Bạn có phiền nhắc lại câu đó chậm hơn một chút cho mình nghe được không?' },
  { id: 'spk_4_07', level: 4, topic: 'Achievement', sentence: 'Unlocking new achievement badges motivates me to explore every corner of town.', meaningVi: 'Việc mở khóa các huy hiệu thành tựu mới tạo động lực để mình khám phá khắp thị trấn.' },
  { id: 'spk_4_08', level: 4, topic: 'History', sentence: 'Visiting museums lets us discover amazing inventions from past centuries.', meaningVi: 'Đi thăm bảo tàng giúp chúng ta khám phá những phát minh kỳ diệu từ các thế kỷ trước.' },
  { id: 'spk_4_09', level: 4, topic: 'Community', sentence: 'Although we live in a busy city, neighbors always look out for one another.', meaningVi: 'Mặc dù sống trong thành phố bận rộn, hàng xóm vẫn luôn quan tâm lẫn nhau.' },
  { id: 'spk_4_10', level: 4, topic: 'Study Tips', sentence: 'Whenever I hear a new word, I write it down and use it in a sentence.', meaningVi: 'Bất cứ khi nào nghe một từ mới, mình đều ghi lại và đặt câu với từ đó.' },
  { id: 'spk_4_11', level: 4, topic: 'Robotics', sentence: 'Our family helper robot reminds us gently whenever an important chore begins.', meaningVi: 'Robot trợ lý gia đình nhắc nhở chúng mình nhẹ nhàng mỗi khi tới giờ làm việc quan trọng.' },
  { id: 'spk_4_12', level: 4, topic: 'Nutrition', sentence: 'A balanced breakfast gives students steady energy throughout the morning classes.', meaningVi: 'Một bữa sáng cân bằng dinh dưỡng mang lại năng lượng bền bỉ suốt buổi học sáng.' },
  { id: 'spk_4_13', level: 4, topic: 'Creativity', sentence: 'Mixing two ordinary objects together in the lab can create something extraordinary.', meaningVi: 'Kết hợp hai đồ vật bình thường trong phòng thí nghiệm có thể tạo ra thứ phi thường.' },
  { id: 'spk_4_14', level: 4, topic: 'Travel', sentence: 'We should check the local weather forecast before organizing an outdoor picnic.', meaningVi: 'Chúng ta nên kiểm tra dự báo thời tiết trước khi tổ chức buổi dã ngoại ngoài trời.' },
  { id: 'spk_4_15', level: 4, topic: 'Cooperation', sentence: 'Because both siblings cooperated well, the living room looked spotless in ten minutes.', meaningVi: 'Vì cả hai anh chị em phối hợp ăn ý, phòng khách đã sạch bong chỉ trong mười phút.' },
  { id: 'spk_4_16', level: 4, topic: 'Respect', sentence: 'Always knock politely and ask permission before entering someone else’s private room.', meaningVi: 'Luôn gõ cửa lịch sự và xin phép trước khi bước vào phòng riêng của người khác.' },

  // ================= LEVEL 5: Fluent Expression & Global Perspectives =================
  { id: 'spk_5_01', level: 5, topic: 'Communication', sentence: 'Speaking directly with international visitors is one of the best ways to master pronunciation.', meaningVi: 'Trò chuyện trực tiếp với du khách quốc tế là một trong những cách tốt nhất để làm chủ phát âm.' },
  { id: 'spk_5_02', level: 5, topic: 'Sustainability', sentence: 'If every household recycled plastic bottles and conserved electricity, our planet would become cleaner.', meaningVi: 'Nếu mỗi hộ gia đình đều tái chế chai nhựa và tiết kiệm điện, hành tinh của chúng ta sẽ sạch đẹp hơn.' },
  { id: 'spk_5_03', level: 5, topic: 'Self-Growth', sentence: 'Making mistakes while practicing a foreign language is completely natural on the path to fluency.', meaningVi: 'Mắc lỗi khi luyện tập ngoại ngữ là điều hoàn toàn tự nhiên trên con đường hướng tới sự trôi chảy.' },
  { id: 'spk_5_04', level: 5, topic: 'Digital Habits', sentence: 'Managing screen time wisely allows children to balance entertainment with physical exercise and reading.', meaningVi: 'Quản lý thời gian dùng thiết bị hợp lý giúp trẻ cân bằng giữa giải trí với vận động và đọc sách.' },
  { id: 'spk_5_05', level: 5, topic: 'Global Village', sentence: 'Understanding different traditions encourages mutual respect and builds lasting friendships across borders.', meaningVi: 'Thấu hiểu các truyền thống khác nhau khuyến khích sự tôn trọng lẫn nhau và xây dựng tình bạn bền lâu.' },
  { id: 'spk_5_06', level: 5, topic: 'Curiosity', sentence: 'Scientists stay curious by asking thoughtful questions about how everyday things actually work.', meaningVi: 'Các nhà khoa học giữ sự tò mò bằng cách đặt câu hỏi sâu sắc về cách mọi thứ quanh ta vận hành.' },
  { id: 'spk_5_07', level: 5, topic: 'Time Management', sentence: 'Prioritizing urgent assignments before playtime prevents unnecessary stress right before the deadline.', meaningVi: 'Ưu tiên bài tập gấp trước giờ chơi giúp tránh căng thẳng không cần thiết ngay sát hạn chót.' },
  { id: 'spk_5_08', level: 5, topic: 'Persistence', sentence: 'Achieving five consecutive successful conversations proves how dedicated you have been to learning.', meaningVi: 'Đạt năm cuộc hội thoại thành công liên tiếp chứng minh bạn đã kiên trì học tập đến nhường nào.' },
  { id: 'spk_5_09', level: 5, topic: 'Empathy', sentence: 'Listening attentively when others share their feelings strengthens trust within the whole family.', meaningVi: 'Lắng nghe chăm chú khi người khác chia sẻ cảm xúc giúp củng cố niềm tin trong cả gia đình.' },
  { id: 'spk_5_10', level: 5, topic: 'Innovation', sentence: 'Future cities will combine green parks with clean energy and helpful autonomous assistants.', meaningVi: 'Các thành phố tương lai sẽ kết hợp công viên xanh với năng lượng sạch và trợ lý tự hành hữu ích.' },
  { id: 'spk_5_11', level: 5, topic: 'Wildlife', sentence: 'Protecting endangered wildlife habitats ensures future generations can admire biodiversity in person.', meaningVi: 'Bảo vệ môi trường sống của động vật quý hiếm đảm bảo thế hệ tương lai được chiêm ngưỡng đa dạng sinh học.' },
  { id: 'spk_5_12', level: 5, topic: 'Gratitude', sentence: 'Appreciating small daily moments with loved ones turns an ordinary afternoon into a cherished memory.', meaningVi: 'Trân trọng những khoảnh khắc nhỏ mỗi ngày bên người thân biến buổi chiều bình thường thành kỷ niệm quý giá.' },
  { id: 'spk_5_13', level: 5, topic: 'Leadership', sentence: 'A great team leader inspires everyone to contribute their unique strengths toward a shared goal.', meaningVi: 'Một trưởng nhóm giỏi truyền cảm hứng để mọi người đóng góp thế mạnh riêng hướng tới mục tiêu chung.' },
  { id: 'spk_5_14', level: 5, topic: 'Critical Thinking', sentence: 'Before believing everything we read online, we should carefully verify facts from reliable sources.', meaningVi: 'Trước khi tin mọi thứ đọc trên mạng, chúng ta nên kiểm chứng thông tin cẩn thận từ nguồn đáng tin cậy.' },
  { id: 'spk_5_15', level: 5, topic: 'Culture Exchange', sentence: 'I would love to introduce traditional Vietnamese cuisine and warm hospitality to travelers worldwide.', meaningVi: 'Mình rất muốn giới thiệu ẩm thực truyền thống Việt Nam và lòng hiếu khách tới du khách khắp thế giới.' },
  { id: 'spk_5_16', level: 5, topic: 'Confidence', sentence: 'Regardless of how challenging a sentence seems at first, steady practice eventually makes it effortless.', meaningVi: 'Dù một câu ban đầu có vẻ khó đến đâu, luyện tập đều đặn cuối cùng cũng giúp bạn nói nhẹ nhàng.' },
];

export function extractEnglishWords(text: string): string[] {
  const matches = String(text || '')
    .toLowerCase()
    .match(/[a-z]{2,}/g);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

export function getTotalCompletedTasksForMember(member: Member, tasks: TaskItem[]): number {
  const taskListCount = (tasks || []).filter(
    (t) =>
      t.status === 'completed' &&
      (t.assigneeId === member.id || (t.participantIds || []).includes(member.id))
  ).length;
  return Math.max(Number(member.completedTaskCount) || 0, taskListCount);
}

export function getAchievementProgress(
  achId: AchievementId | string,
  member: Member,
  tasks: TaskItem[]
): { current: number; target: number; unlocked: boolean } {
  const def = ACHIEVEMENT_CATALOG.find((a) => a.id === achId);
  const target = def?.target || 1;
  const unlockedArr = Array.isArray(member.unlockedAchievements) ? member.unlockedAchievements : [];
  const alreadyUnlocked = unlockedArr.some((u) => u && u.id === achId);

  const tasksDone = getTotalCompletedTasksForMember(member, tasks);
  const wordsCount = Array.isArray(member.englishWordsUsed) ? member.englishWordsUsed.length : 0;
  const quizHist = member.englishQuizHistory || [];
  const hasPerfectQuiz = quizHist.some((q) => q.total > 0 && q.score >= q.total);
  const speakHist = member.speakingHistory || [];
  const passSpeakCount = speakHist.filter((s) => s.accuracy >= 80).length;
  const hasSpeak95 = speakHist.some((s) => s.accuracy >= 95);
  const speakLv = Math.max(1, Number(member.speakingLevel) || 1);
  const comicCount = member.comicReadStats?.completedIds?.length || 0;
  const hatchedPetsCount = (member.pets || []).filter((p) => p.hatched).length;
  const zooCount = (member.unlockedZooAnimals || []).length;

  let current = 0;
  switch (achId) {
    case 'first_task':
    case 'tasks_10':
    case 'tasks_50':
    case 'tasks_100':
      current = tasksDone;
      break;
    case 'eng_words_50':
    case 'eng_words_200':
    case 'eng_words_500':
      current = wordsCount;
      break;
    case 'eng_quiz_perfect':
      current = hasPerfectQuiz || alreadyUnlocked ? 1 : 0;
      break;
    case 'eng_quiz_10':
      current = quizHist.length;
      break;
    case 'speak_first':
      current = passSpeakCount > 0 || alreadyUnlocked ? 1 : 0;
      break;
    case 'speak_95':
      current = hasSpeak95 || alreadyUnlocked ? 1 : 0;
      break;
    case 'speak_lv3':
    case 'speak_lv5':
      current = speakLv;
      break;
    case 'comic_5':
      current = comicCount;
      break;
    case 'pet_first':
      current = hatchedPetsCount > 0 || alreadyUnlocked ? 1 : 0;
      break;
    case 'zoo_10':
      current = zooCount;
      break;
    default:
      current = alreadyUnlocked ? target : 0;
  }

  return {
    current: Math.min(target, Math.max(0, current)),
    target,
    unlocked: alreadyUnlocked || current >= target,
  };
}

export function evaluateMemberAchievements(member: Member, tasks: TaskItem[]): AchievementDef[] {
  if (!Array.isArray(member.unlockedAchievements)) {
    member.unlockedAchievements = [];
  }
  const existing = new Set(member.unlockedAchievements.map((u) => u.id));
  const newlyUnlocked: AchievementDef[] = [];
  ACHIEVEMENT_CATALOG.forEach((def) => {
    if (existing.has(def.id)) return;
    const prog = getAchievementProgress(def.id, member, tasks);
    if (prog.current >= prog.target) {
      newlyUnlocked.push(def);
    }
  });
  return newlyUnlocked;
}

function normalizeSpeechToken(tok: string): string {
  return tok
    .toLowerCase()
    .replace(/['’]s\b/g, 's')
    .replace(/[^a-z0-9]/g, '');
}

function levenshteinDist(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[b.length];
}

export function scoreSpeakingPronunciation(
  targetSentence: string,
  spokenText: string
): {
  accuracy: number;
  wordMatches: Array<{ word: string; hit: boolean }>;
  feedback: string;
} {
  const rawWords = String(targetSentence || '')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
  const targetTokens = rawWords.map((w) => normalizeSpeechToken(w));
  const spokenTokens = String(spokenText || '')
    .split(/\s+/)
    .map(normalizeSpeechToken)
    .filter(Boolean);

  if (targetTokens.length === 0 || spokenTokens.length === 0) {
    return {
      accuracy: 0,
      wordMatches: rawWords.map((w) => ({ word: w, hit: false })),
      feedback: 'Chưa nhận được giọng nói tiếng Anh.',
    };
  }

  const remainingSpoken = [...spokenTokens];
  let totalWeight = 0;
  let validTargetCount = 0;
  const wordMatches: Array<{ word: string; hit: boolean }> = [];

  targetTokens.forEach((t, idx) => {
    const displayWord = rawWords[idx] || t;
    if (!t) {
      wordMatches.push({ word: displayWord, hit: true });
      return;
    }
    validTargetCount += 1;
    const exactIdx = remainingSpoken.indexOf(t);
    if (exactIdx !== -1) {
      totalWeight += 1;
      wordMatches.push({ word: displayWord, hit: true });
      remainingSpoken.splice(exactIdx, 1);
      return;
    }
    let bestIdx = -1;
    let bestSim = 0;
    remainingSpoken.forEach((s, sIdx) => {
      const maxLen = Math.max(t.length, s.length);
      if (maxLen === 0) return;
      const d = levenshteinDist(t, s);
      const sim = 1 - d / maxLen;
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = sIdx;
      }
    });
    if (bestIdx !== -1 && bestSim >= 0.7) {
      totalWeight += bestSim >= 0.85 ? 0.92 : 0.78;
      wordMatches.push({ word: displayWord, hit: true });
      remainingSpoken.splice(bestIdx, 1);
    } else {
      wordMatches.push({ word: displayWord, hit: false });
    }
  });

  const denom = Math.max(1, validTargetCount);
  const lengthRatio = Math.min(1, denom / Math.max(1, spokenTokens.length * 0.85));
  const rawPct = (totalWeight / denom) * (0.85 + 0.15 * lengthRatio) * 100;
  const accuracy = Math.max(0, Math.min(100, Math.round(rawPct)));

  let feedback = 'Hãy cố gắng đọc chậm, rõ từng từ và thử lại nhé!';
  if (accuracy >= 95) feedback = 'Xuất sắc! Phát âm cực kỳ tự nhiên và chuẩn xác!';
  else if (accuracy >= 80) feedback = 'Tuyệt vời! Bạn đã giao tiếp đạt chuẩn >= 80%!';
  else if (accuracy >= 60) feedback = 'Khá tốt rồi, nhưng cần >= 80% mới được cộng sao nhé!';

  return { accuracy, wordMatches, feedback };
}

function escapeCsvCell(val: string | number): string {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCsvRows(csvText: string): string[][] {
  const text = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

export function exportSpeakingBankToCsv(items: SpeakingBankQuestion[]): string {
  const header = ['id', 'level', 'topic', 'sentence', 'meaningVi'];
  const lines = [header.join(',')];
  items.forEach((s) => {
    lines.push(
      [
        escapeCsvCell(s.id),
        escapeCsvCell(s.level),
        escapeCsvCell(s.topic),
        escapeCsvCell(s.sentence),
        escapeCsvCell(s.meaningVi),
      ].join(',')
    );
  });
  return '\uFEFF' + lines.join('\r\n');
}

export function parseSpeakingBankCsv(csvText: string): {
  questions: SpeakingBankQuestion[];
  errors: number;
} {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return { questions: [], errors: 1 };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idxOf = (names: string[]) => header.findIndex((h) => names.includes(h));
  const idCol = idxOf(['id']);
  const lvCol = idxOf(['level', 'lv', 'cap_do']);
  const topicCol = idxOf(['topic', 'chu_de']);
  const textCol = idxOf(['sentence', 'text', 'cau_tieng_anh']);
  const viCol = idxOf(['meaningvi', 'vi', 'meaning', 'nghia']);

  if (textCol === -1) {
    return { questions: [], errors: 1 };
  }

  const questions: SpeakingBankQuestion[] = [];
  let errors = 0;

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const txt = (cols[textCol] || '').trim();
    if (!txt || txt.split(/\s+/).length < 2) {
      errors += 1;
      continue;
    }
    const rawLv = lvCol >= 0 ? Number(cols[lvCol]) : 1;
    const level = Math.max(1, Math.min(5, Math.round(rawLv || 1))) as SpeakingLevel;
    const topic = (topicCol >= 0 ? cols[topicCol] : 'Daily Life')?.trim() || 'Daily Life';
    const meaningVi = (viCol >= 0 ? cols[viCol] : '')?.trim() || '';
    const id =
      (idCol >= 0 ? cols[idCol]?.trim() : '') ||
      `spk_csv_${level}_${r}_${Date.now().toString(36).slice(-4)}`;
    questions.push({ id, level, topic, sentence: txt, meaningVi, custom: true });
  }

  return { questions, errors };
}
