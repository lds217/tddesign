/* Phông chữ, bảng màu, mẫu thiệp và câu chúc có sẵn */
(function (global) {
  'use strict';
  const O = global.Orn;

  // Tất cả đều là Google Fonts có hỗ trợ đầy đủ tiếng Việt
  const FONTS = [
    { family: 'Great Vibes', label: 'Bay bướm', kind: 'script' },
    { family: 'Dancing Script', label: 'Viết tay mềm', kind: 'script' },
    { family: 'Charm', label: 'Thư pháp', kind: 'script' },
    { family: 'Alex Brush', label: 'Nét cọ', kind: 'script' },
    { family: 'Pacifico', label: 'Tròn vui', kind: 'display' },
    { family: 'Lobster', label: 'Nét đậm', kind: 'display' },
    { family: 'Pattaya', label: 'Bút lông', kind: 'display' },
    { family: 'Playfair Display', label: 'Sang trọng', kind: 'serif' },
    { family: 'Lora', label: 'Cổ điển', kind: 'serif' },
    { family: 'Cormorant Garamond', label: 'Thanh lịch', kind: 'serif' },
    { family: 'Bevan', label: 'In đậm có chân', kind: 'serif' },
    { family: 'Baloo 2', label: 'Tròn đậm', kind: 'sans' },
    { family: 'Be Vietnam Pro', label: 'Hiện đại', kind: 'sans' },
    { family: 'Patrick Hand', label: 'Chữ học trò', kind: 'hand' },
  ];

  // Bảng màu thiệp: nền, nền viền (đậm hơn ở mép), khung, tiêu đề, chữ
  const THEMES = {
    kem: { name: 'Kem vàng', bg: '#FFF8EA', bg2: '#F6E6C3', frame: '#B8862B', title: '#A3201D', text: '#4A2E1C' },
    do: { name: 'Đỏ son', bg: '#B3202A', bg2: '#7C1016', frame: '#EBC165', title: '#FFD97A', text: '#FFF1D6' },
    trang: { name: 'Trắng', bg: '#FFFFFF', bg2: '#FFFFFF', frame: '#D6A949', title: '#B3261E', text: '#333333' },
    hong: { name: 'Hồng đào', bg: '#FFF2F5', bg2: '#FAD4DE', frame: '#D07A92', title: '#BE1E5A', text: '#5B2C3A' },
    ngoc: { name: 'Xanh ngọc', bg: '#F0F7F1', bg2: '#D3E8D8', frame: '#3C7A5A', title: '#1F5E42', text: '#2C3B33' },
    vang: { name: 'Vàng kim', bg: '#FDF1CC', bg2: '#F0CF77', frame: '#8A5A12', title: '#9B1C1C', text: '#4B2E05' },
    dem: { name: 'Xanh đêm', bg: '#1A3563', bg2: '#0D1F3D', frame: '#D8B25C', title: '#F3D48A', text: '#EEE6D6' },
  };

  // Màu chữ gợi ý (null = tự động theo màu thiệp)
  const TEXT_COLORS = [
    { c: null, name: 'Tự động' },
    { c: '#A3201D', name: 'Đỏ son' },
    { c: '#E03131', name: 'Đỏ tươi' },
    { c: '#B8862B', name: 'Vàng đồng' },
    { c: '#FFD97A', name: 'Vàng sáng' },
    { c: '#E8590C', name: 'Cam' },
    { c: '#BE1E5A', name: 'Hồng' },
    { c: '#7B2CBF', name: 'Tím' },
    { c: '#1864AB', name: 'Xanh dương' },
    { c: '#1F5E42', name: 'Xanh lá' },
    { c: '#5C3A1E', name: 'Nâu' },
    { c: '#222222', name: 'Đen' },
    { c: '#FFFFFF', name: 'Trắng' },
  ];

  /* Mỗi mẫu:
   *  sizes: cỡ chữ gốc (đơn vị = 1% cạnh ngắn của thiệp)
   *  pad:   lề trong [trên, phải, dưới, trái] (cùng đơn vị) để chữ không đè hình
   *  deco(w, h, m, theme): vẽ hình trang trí, w/h tính bằng mm, m = cạnh ngắn */
  const TEMPLATES = [
    {
      id: 'camon', name: 'Thư cảm ơn', theme: 'kem', layout: '4', orient: 'portrait', shop: true,
      text: {
        title: 'Lời Cảm Ơn',
        to: 'Kính gửi Quý khách thân mến,',
        msg: 'Cảm ơn Quý khách đã tin tưởng và lựa chọn yến sào của chúng tôi. Từng tổ yến đều được chọn lọc kỹ và làm sạch thủ công bằng cả tấm lòng.\nKính chúc Quý khách và gia đình luôn dồi dào sức khỏe, bình an và hạnh phúc.',
        sign: 'Trân trọng cảm ơn!',
      },
      style: { title: { font: 'Great Vibes' }, body: { font: 'Lora' } },
      sizes: { title: 14, to: 4.8, msg: 4.5, sign: 7, shop: 3.4 },
      fieldFont: { sign: 'title' }, toStyle: 'italic',
      pad: [18, 12, 12, 12], divider: true,
      deco: (w, h, m, t) =>
        O.drum(w / 2, h * 0.54, m * 0.37, t.frame, 0.075) +
        O.frameClassic(w, h, m, t.frame) +
        O.swallow(w / 2 - m * 0.06, m * 0.115, m * 0.1, t.title, -14) +
        O.swallow(w / 2 + m * 0.065, m * 0.093, m * 0.075, t.title, 12),
    },
    {
      id: 'camonnho', name: 'Thẻ cảm ơn nhỏ', theme: 'kem', layout: '10', orient: 'landscape', shop: true,
      text: { title: 'Cảm ơn bạn!', to: '', msg: 'Chúc bạn và gia đình luôn mạnh khỏe, bình an!', sign: '' },
      style: { title: { font: 'Dancing Script', bold: true }, body: { font: 'Be Vietnam Pro' } },
      sizes: { title: 19, to: 5.6, msg: 5.6, sign: 5.4, shop: 4.6 },
      pad: [11, 12, 9, 12],
      deco: (w, h, m, t) =>
        O.frameSimple(w, h, m, t.frame, true) +
        O.flock(w - m * 0.25, m * 0.2, m * 0.12, t.title, 3),
    },
    {
      id: 'kinhtang', name: 'Kính tặng (quà biếu)', theme: 'do', layout: '4', orient: 'portrait', shop: false,
      text: {
        title: 'Kính Tặng',
        to: 'Bác Hai và gia đình',
        msg: 'Chút quà nhỏ thay lời chúc sức khỏe, bình an và may mắn. Mong bác luôn vui khỏe bên con cháu.',
        sign: 'Cháu Lan kính tặng',
      },
      style: { title: { font: 'Charm', bold: true }, body: { font: 'Lora' } },
      sizes: { title: 14, to: 8.2, msg: 4.5, sign: 6.2, shop: 3.3 },
      fieldFont: { to: 'title', sign: 'title' },
      pad: [21, 13, 25, 13], divider: true,
      deco: (w, h, m, t) =>
        O.frameHoivan(w, h, m, t.frame) +
        O.lotus(w / 2, h - m * 0.08, m * 0.27, 'line', t.frame, t.bg) +
        O.swallow(w / 2 - m * 0.055, m * 0.135, m * 0.085, t.frame, -14) +
        O.swallow(w / 2 + m * 0.06, m * 0.113, m * 0.065, t.frame, 12),
    },
    {
      id: 'dongchu', name: 'Chỉ dòng chữ', theme: 'trang', layout: 'strip', orient: 'landscape', shop: false, plain: true,
      text: { title: '', to: '', msg: 'Cảm ơn bạn rất nhiều!', sign: '' },
      style: { title: { font: 'Dancing Script', bold: true }, body: { font: 'Dancing Script', bold: true } },
      colors: { title: '#A3201D', body: '#A3201D' },
      sizes: { title: 30, to: 26, msg: 40, sign: 22, shop: 14 },
      pad: [7, 6, 7, 6],
      deco: null,
    },
    {
      // Kiểu chữ dán hộp quà: 3 dòng, mỗi dòng một kiểu chữ riêng, khung song hồi văn
      id: 'khung', name: 'Chữ kính biếu (khung hồi văn)', theme: 'trang', layout: '10', orient: 'landscape', shop: false, lines: true,
      text: { title: 'CÔNG TY', to: 'AN PHÁT', msg: 'Kính Biếu', sign: '' },
      style: { title: { font: 'Bevan' }, to: { font: 'Bevan' }, msg: { font: 'Great Vibes' }, sign: { font: 'Dancing Script' } },
      colors: { title: '#E0141B', to: '#E0141B', msg: '#E0141B', sign: '#E0141B' },
      sizes: { title: 12, to: 18, msg: 27, sign: 8, shop: 4.6 },
      gap: 0.3, tight: true,
      pad: [16, 15, 16, 15],
      deco: (w, h, m, t) => O.frameLattice(w, h, m, t.frame),
    },
    {
      // Chữ rời có đường viền cắt ôm theo chữ (cắt ra làm sticker)
      id: 'sticker', name: 'Chữ có viền cắt (sticker)', theme: 'trang', layout: '10', orient: 'landscape', shop: false, lines: true, plain: true, contour: 'vua',
      text: { title: 'Chúc Mừng Sinh Nhật', to: 'Chị Trà', msg: 'Chúc chị luôn xinh đẹp và thành công!', sign: '' },
      style: { title: { font: 'Lobster' }, to: { font: 'Baloo 2', bold: true }, msg: { font: 'Dancing Script' }, sign: { font: 'Dancing Script' } },
      colors: { title: '#E0141B', to: '#E0141B', msg: '#E0141B', sign: '#E0141B' },
      sizes: { title: 17, to: 27, msg: 10, sign: 8, shop: 4.6 },
      gap: 0, tight: true,
      pad: [10, 9, 10, 9],
      deco: null,
    },
    {
      id: 'tet', name: 'Chúc Tết', theme: 'do', layout: '4', orient: 'portrait', shop: true,
      text: { title: 'Chúc Mừng Năm Mới', to: '', msg: 'An Khang Thịnh Vượng\nVạn Sự Như Ý', sign: 'Xuân Đinh Mùi 2027' },
      style: { title: { font: 'Dancing Script', bold: true }, body: { font: 'Playfair Display', bold: true } },
      sizes: { title: 12, to: 5, msg: 6.4, sign: 4.4, shop: 3.3 },
      pad: [31, 11, 12, 11], divider: true,
      deco: (w, h, m, t) =>
        O.frameClassic(w, h, m, t.frame) +
        O.branch(m * 0.07, m * 0.085, m * 0.58, 'mai') +
        O.lantern(w - m * 0.15, m * 0.055, m * 0.05, m * 0.2, '#E03A2C', t.frame) +
        O.lantern(w - m * 0.29, m * 0.055, m * 0.015, m * 0.15, '#E03A2C', t.frame),
    },
    {
      id: 'bieu', name: 'Biếu ông bà, cha mẹ', theme: 'vang', layout: '4', orient: 'portrait', shop: false,
      text: {
        title: 'Kính Biếu',
        to: 'Ông Bà Nội',
        msg: 'Kính chúc Ông Bà sống lâu trăm tuổi, luôn mạnh khỏe và vui vầy bên con cháu.',
        sign: 'Con cháu kính biếu',
      },
      style: { title: { font: 'Charm', bold: true }, body: { font: 'Lora' } },
      sizes: { title: 14, to: 7.6, msg: 4.8, sign: 5.2, shop: 3.3 },
      fieldFont: { to: 'title' }, signStyle: 'italic',
      pad: [17, 13, 24, 13], divider: true,
      deco: (w, h, m, t) =>
        O.drum(w / 2, h * 0.48, m * 0.4, t.frame, 0.11) +
        O.frameHoivan(w, h, m, t.frame) +
        O.peach(m * 0.24, h - m * 0.165, m * 0.15, -12) + O.peach(m * 0.36, h - m * 0.13, m * 0.11, 12) +
        O.peach(w - m * 0.24, h - m * 0.165, m * 0.15, 12) + O.peach(w - m * 0.36, h - m * 0.13, m * 0.11, -12),
    },
    {
      id: 'maukhoe', name: 'Chúc mau khỏe', theme: 'ngoc', layout: '4', orient: 'portrait', shop: false,
      text: {
        title: 'Chúc Mau Khỏe',
        to: 'Gửi chị Mai,',
        msg: 'Mong chị sớm bình phục và luôn khỏe mạnh. Gửi chút yến sào để chị bồi bổ sức khỏe nhé!',
        sign: 'Thương mến, Hoa',
      },
      style: { title: { font: 'Dancing Script', bold: true }, body: { font: 'Lora' } },
      sizes: { title: 12.5, to: 5.2, msg: 4.6, sign: 5.6, shop: 3.3 },
      fieldFont: { sign: 'title' },
      pad: [17, 12, 27, 12],
      deco: (w, h, m, t) =>
        O.frameSimple(w, h, m, t.frame, true) +
        O.lotus(w / 2, h - m * 0.075, m * 0.3, 'color') +
        O.cloud(m * 0.09, m * 0.085, m * 0.15, t.frame) +
        O.cloud(w - m * 0.09, m * 0.085, m * 0.15, t.frame, true),
    },
    {
      id: 'phunu', name: 'Tặng mẹ, 20/10, 8/3', theme: 'hong', layout: '4', orient: 'portrait', shop: false,
      text: {
        title: 'Chúc Mừng 20/10',
        to: 'Gửi Mẹ yêu,',
        msg: 'Chúc Mẹ luôn xinh đẹp, mạnh khỏe và thật nhiều niềm vui. Con yêu Mẹ!',
        sign: 'Con của Mẹ',
      },
      style: { title: { font: 'Great Vibes' }, body: { font: 'Lora' } },
      sizes: { title: 12.5, to: 5.4, msg: 4.7, sign: 5.8, shop: 3.3 },
      fieldFont: { sign: 'title' },
      pad: [27, 12, 14, 12],
      deco: (w, h, m) =>
        O.frameSimple(w, h, m, '#D07A92', false) +
        O.branch(w - m * 0.045, m * 0.07, m * 0.6, 'dao', true) +
        O.blossom(m * 0.12, h - m * 0.12, m * 0.045, 'dao', 10) +
        O.blossom(m * 0.2, h - m * 0.085, m * 0.032, 'dao', 40) +
        O.bud(m * 0.085, h - m * 0.19, m * 0.012, 'dao', -20),
    },
    {
      id: 'chaomung', name: 'Thiệp chào mừng', theme: 'ngoc', layout: '4', orient: 'portrait', shop: true,
      text: {
        title: 'Chào Mừng',
        to: 'Quý khách đến với tiệm yến nhà mình!',
        msg: 'Mỗi tổ yến đều được chọn lọc kỹ càng, làm sạch thủ công và đóng gói cẩn thận. Chúc Quý khách luôn khỏe đẹp và an vui!',
        sign: 'Hẹn gặp lại Quý khách!',
      },
      style: { title: { font: 'Great Vibes' }, body: { font: 'Lora' } },
      sizes: { title: 14, to: 4.8, msg: 4.3, sign: 5.6, shop: 3.3 },
      fieldFont: { sign: 'title' }, toStyle: 'bold',
      pad: [24, 12, 13, 12], divider: true,
      deco: (w, h, m, t) =>
        O.frameClassic(w, h, m, t.frame) +
        O.flock(w / 2, m * 0.15, m * 0.11, t.title, 5) +
        O.cloud(m * 0.11, m * 0.115, m * 0.13, t.frame) +
        O.cloud(w - m * 0.11, m * 0.115, m * 0.13, t.frame, true),
    },
    {
      id: 'huongdan', name: 'Cách chưng yến', theme: 'kem', layout: '4', orient: 'portrait', shop: true,
      text: {
        title: 'Cách Chưng Yến',
        to: '',
        msg: '1. Ngâm yến với nước sạch khoảng 30 phút cho nở mềm.\n2. Vớt ra, để ráo, xé nhỏ theo sợi.\n3. Chưng cách thủy lửa nhỏ 15–20 phút.\n4. Cho đường phèn vào, chưng thêm 5 phút.\n5. Dùng nóng hoặc để mát đều ngon.',
        sign: 'Bảo quản nơi khô ráo, thoáng mát.',
      },
      style: { title: { font: 'Playfair Display', bold: true }, body: { font: 'Be Vietnam Pro', align: 'left' } },
      sizes: { title: 10, to: 4.4, msg: 4.3, sign: 3.9, shop: 3.3 },
      signStyle: 'italic',
      pad: [17, 12, 11, 12], divider: true,
      deco: (w, h, m, t) =>
        O.frameSimple(w, h, m, t.frame, true) +
        O.swallow(w / 2 - m * 0.05, m * 0.105, m * 0.08, t.title, -12) +
        O.swallow(w / 2 + m * 0.055, m * 0.09, m * 0.06, t.title, 12),
    },
    {
      id: 'nhan', name: 'Nhãn dán hộp yến', theme: 'trang', layout: '21', orient: 'landscape', shop: true,
      text: { title: 'Yến Sào Tinh Chế', to: '', msg: 'Khối lượng: 50g', sign: 'NSX: ......./......./..........' },
      style: { title: { font: 'Playfair Display', bold: true }, body: { font: 'Be Vietnam Pro' } },
      sizes: { title: 13, to: 6, msg: 7.2, sign: 6.2, shop: 6.2 },
      pad: [8, 9, 8, 9],
      deco: (w, h, m, t) => O.frameSimple(w, h, m, t.frame, true),
    },
  ];

  const TITLE_PRESETS = [
    'Lời Cảm Ơn', 'Cảm ơn bạn!', 'Thank You', 'Kính Tặng', 'Thân Tặng', 'Kính Biếu',
    'Chúc Mừng Năm Mới', 'Mừng Thọ', 'Chúc Mau Khỏe', 'Chúc Mừng 20/10', 'Chúc Mừng 8/3',
    'Chúc Mừng Sinh Nhật', 'Chào Mừng',
  ];

  const PHRASES = [
    {
      group: 'Cảm ơn khách hàng',
      items: [
        'Cảm ơn Quý khách đã tin tưởng và ủng hộ. Chúc Quý khách và gia đình luôn mạnh khỏe, bình an!',
        'Cảm ơn bạn đã chọn yến sào của nhà mình. Mong món quà nhỏ này mang thật nhiều sức khỏe đến bạn và người thân.',
        'Mỗi tổ yến là cả tấm lòng. Cảm ơn Quý khách đã đồng hành cùng chúng tôi!',
        'Sự hài lòng của Quý khách là niềm vui của chúng tôi. Hẹn gặp lại Quý khách!',
        'Cảm ơn bạn rất nhiều! Nếu hài lòng, bạn giới thiệu giúp tiệm cho người thân và bạn bè nhé.',
      ],
    },
    {
      group: 'Quà tặng – chúc sức khỏe',
      items: [
        'Chút quà nhỏ thay lời chúc sức khỏe, bình an và may mắn.',
        'Gửi tặng sức khỏe, gói trọn yêu thương.',
        'Chúc bạn luôn dồi dào sức khỏe, trẻ đẹp và hạnh phúc.',
        'Kính chúc sức khỏe dồi dào, an khang thịnh vượng.',
        'Món quà nhỏ, tấm lòng lớn — chúc bạn luôn khỏe mạnh và an vui.',
      ],
    },
    {
      group: 'Biếu ông bà, cha mẹ',
      items: [
        'Kính chúc Ông Bà sống lâu trăm tuổi, phúc thọ an khang.',
        'Con kính chúc Ba Mẹ thật nhiều sức khỏe, vui vầy bên con cháu.',
        'Phúc như Đông Hải\nThọ tỷ Nam Sơn',
        'Kính chúc Ông Bà luôn mạnh khỏe, minh mẫn và an vui tuổi già.',
      ],
    },
    {
      group: 'Thăm người bệnh',
      items: [
        'Chúc bạn mau khỏe lại! Gửi chút yến sào để bồi bổ sức khỏe nhé.',
        'Mong bạn sớm bình phục, luôn vui vẻ và mạnh khỏe.',
        'Chúc mẹ tròn con vuông, mẹ mau lại sức!',
      ],
    },
    {
      group: 'Tết và ngày lễ',
      items: [
        'An Khang Thịnh Vượng\nVạn Sự Như Ý',
        'Chúc Mừng Năm Mới\nTấn Tài Tấn Lộc',
        'Chúc năm mới sức khỏe dồi dào, gia đình hạnh phúc, công việc hanh thông.',
        'Chúc mừng ngày Phụ nữ Việt Nam 20/10! Chúc bạn luôn xinh đẹp và hạnh phúc.',
        'Chúc mừng ngày Quốc tế Phụ nữ 8/3! Chúc bạn luôn rạng rỡ và yêu đời.',
        'Chúc mừng sinh nhật! Chúc bạn tuổi mới thật nhiều niềm vui và sức khỏe.',
        'Trung thu đoàn viên, chúc gia đình mình luôn sum vầy, ấm áp.',
      ],
    },
    {
      group: 'Câu ngắn một dòng',
      items: [
        'Cảm ơn bạn rất nhiều!', 'Thân tặng', 'Kính biếu', 'Quà tặng sức khỏe',
        'Chúc mau khỏe', 'Yêu thương gửi trao', 'Hàng dễ vỡ – xin nhẹ tay', 'Chúc ngon miệng!',
      ],
    },
  ];

  global.TD = { FONTS, THEMES, TEXT_COLORS, TEMPLATES, TITLE_PRESETS, PHRASES };
})(window);
