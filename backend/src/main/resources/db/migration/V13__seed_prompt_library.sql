-- V13: 填充提示词库种子数据（每日精选 + 热门推荐）
-- 每个分类 4-5 条高质量提示词，含合理互动数据

INSERT INTO prompt_library
  (category_id, title, prompt_text, content_cn, prompt_hash, source, source_url, author, language, is_template, tags, sort_order, status, view_count, like_count, copy_count, favorite_count)
VALUES

-- ═══════════ 1. 人像摄影 — 👤 ═══════════
(1, '自然光电影感人像',
'Cinematic portrait photography of a young woman with natural sunlight streaming through a window, soft golden hour glow, shallow depth of field f/1.4, cream bokeh background, Fujifilm Pro 400H film simulation, warm tones, professional fashion editorial style, 85mm lens, hyperrealistic skin texture, subtle freckles, windswept hair, elegant casual clothing --ar 3:4 --stylize 300',
'电影感自然光人像摄影：年轻女性倚窗而立，金色柔光穿透窗户，奶油般焦外虚化，Fujifilm Pro 400H 胶片模拟，暖色调，专业时尚杂志质感，85mm镜头浅景深',
SHA2('v13-portrait-cinematic-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '人像,电影感,自然光,摄影', 0, 'published', 3847, 512, 289, 67),

(1, '商业肖像布光',
'Professional commercial headshot, studio lighting setup with beauty dish and rim lights, clean white background, middle-aged business executive in tailored navy suit, confident expression, sharp focus on eyes, Canon EOS R5 85mm f/1.2, commercial photography style, crisp details, minimal retouching, professional color grading --ar 2:3',
'商业棚拍肖像：影棚布光雷达罩+轮廓光，纯白背景，中年商务人士身着藏蓝西装，眼神锐利自信，Canon R5 85mm f/1.2 商用级质感',
SHA2('v13-portrait-studio-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '人像,商业摄影,棚拍,布光', 1, 'published', 2156, 398, 175, 42),

(1, '雨中街拍情绪人像',
'Moody street portrait in the rain, reflections on wet pavement, neon city lights blurred in background, young Asian person wearing oversized trench coat, cinematic color grading with teal and orange tones, Blade Runner aesthetic, 50mm lens, f/2.0, shallow depth of field, film grain texture --ar 2:3 --stylize 250',
'雨夜街拍情绪人像：湿润路面倒映霓虹，亚裔青年身着oversize风衣，青橙电影色调，银翼杀手美学，50mm f/2.0浅景深胶片颗粒感',
SHA2('v13-portrait-rain-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '人像,街拍,雨天,情绪', 2, 'published', 2891, 445, 201, 55),

(1, '复古黑白肖像',
'Timeless black and white portrait, dramatic chiaroscuro lighting, single light source from above, strong shadows across face, elegant woman in vintage black dress, fine art photography style, Ilford HP5 film simulation, grainy texture, 50mm prime lens, museum quality print aesthetic, high contrast, emotional depth --ar 1:1',
'经典黑白人像：戏剧性明暗对比光，单灯顶光，优雅女性着复古黑裙，Ilford HP5胶片模拟，博物馆级艺术摄影质感，高对比度',
SHA2('v13-portrait-bw-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '人像,黑白,复古,艺术摄影', 3, 'published', 1723, 356, 142, 38),

(1, '花园外景少女写真',
'Soft dreamy outdoor portrait in blooming cherry blossom garden, young woman in flowing white dress, magical golden hour backlight, petal bokeh, ethereal atmosphere, 135mm f/2.0 telephoto compression, whimsical fairy tale aesthetic, soft focus edges, pastel color palette, editorial beauty photography --ar 3:4 --stylize 350',
'花园少女写真：樱花满园，白裙少女逆光而立，金色时刻魔幻氛围，135mm f/2.0 长焦压缩，童话梦幻美学，柔和粉彩色调',
SHA2('v13-portrait-garden-005', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '人像,花园,少女,唯美', 4, 'published', 4521, 678, 312, 89),

-- ═══════════ 2. 海报设计 — 🎨 ═══════════
(2, '极简主义电影海报',
'Minimalist movie poster design, bold typography centered, single striking visual element, dark moody background with dramatic spotlight, high contrast red and black color scheme, grunge texture overlay, Japanese film festival aesthetic, negative space composition, editorial design quality, vector art + photographic composite --ar 2:3 --stylize 400',
'极简电影海报：粗体文字居中，单一视觉冲击元素，深色氛围背景+戏剧聚光，红黑高反差配色，日式电影节美学，负空间构图',
SHA2('v13-poster-minimal-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '海报,极简,电影,设计', 0, 'published', 5621, 823, 456, 112),

(2, '音乐节霓虹海报',
'Vibrant music festival poster, retro wave aesthetic, neon purple and cyan gradient, synthwave sunset background, geometric grid overlay, bold sans-serif typography with glow effect, cassette tape and palm tree silhouettes, vaporwave art style, halftone dot pattern, 80s nostalgia, high energy composition --ar 2:3 --stylize 500',
'音乐节霓虹海报：复古波浪潮美学，紫青霓虹渐变，合成波日落，几何网格叠层，发光无衬线粗体字，80年代怀旧蒸汽波风格',
SHA2('v13-poster-neon-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '海报,音乐节,霓虹,复古', 1, 'published', 3892, 567, 298, 78),

(2, '环保主题公益海报',
'Environmental awareness poster, melting glacier with stark contrast, minimalist composition, blue and white color palette, powerful conceptual imagery, clean Swiss design style, bilingual typography, negative space for text placement, photorealistic ice texture, dramatic lighting, emotional impact --ar 3:4',
'环保公益海报：冰川消融强烈对比，极简构图蓝白配色，瑞士设计风格，中英双语排版，写实冰纹质感，戏剧性光影',
SHA2('v13-poster-eco-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '海报,环保,公益,概念设计', 2, 'published', 2108, 392, 168, 45),

(2, '产品发布会海报',
'Premium product launch event poster, elegant dark gradient background, product silhouette with dramatic rim lighting, sophisticated gold foil effect accents, luxury brand aesthetic, clean modern typography with metallic finish, minimalist layout with generous white space, high-end fashion magazine quality --ar 3:4 --stylize 300',
'高端产品发布会海报：优雅暗色渐变背景，产品轮廓戏剧性轮廓光，烫金效果点缀，奢侈品美学，现代金属质感文字',
SHA2('v13-poster-product-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '海报,产品发布,高端,商业', 3, 'published', 2623, 415, 203, 52),

(2, '科幻大片横幅海报',
'Epic sci-fi movie banner poster, massive spaceship entering atmosphere, orange and teal cinematic color grading, dramatic lens flare, 8K hyperdetailed, atmospheric clouds and debris, bold movie title typography bottom third, IMAX aspect ratio, blockbuster visual effects quality, photorealistic + concept art hybrid --ar 16:9 --stylize 600',
'科幻大片横幅：巨型飞船突破大气层，青橙电影调色，戏剧性镜头光晕，8K极致细节，IMAX宽幅，商业大片视效品质',
SHA2('v13-poster-scifi-005', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '海报,科幻,电影,横幅', 4, 'published', 7823, 1024, 589, 156),

-- ═══════════ 3. 信息图 — 📊 ═══════════
(3, '咖啡风味轮信息图',
'Elegant coffee flavor wheel infographic, circular radial design, warm brown and cream color palette, botanical illustrations of coffee beans and leaves, clean data visualization of tasting notes, minimalist flat design style, educational content layout, coffee culture aesthetic, vector art quality --ar 1:1',
'咖啡风味轮信息图：优雅圆形径向布局，暖棕奶油色调，咖啡豆植物插图，品鉴笔记数据可视化，极简扁平设计，咖啡文化美学',
SHA2('v13-info-coffee-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '信息图,咖啡,数据可视化,扁平设计', 0, 'published', 1432, 267, 98, 35),

(3, '科技公司年度报告',
'Modern tech company annual report data visualization, dark theme with glowing accent colors, line charts and bar graphs with neon cyan highlights, geometric data patterns, isometric 3D data cubes, futuristic dashboard aesthetic, clean sans-serif typography, UI/UX design quality --ar 16:9',
'科技年报数据可视化：暗色主题发光强调色，霓虹青折线图，几何数据图案，等距3D数据立方体，未来感仪表盘美学',
SHA2('v13-info-report-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '信息图,年度报告,科技,数据', 1, 'published', 1987, 312, 156, 41),

(3, '健身训练流程图',
'Fitness workout plan infographic, energetic orange and black color scheme, bold athletic typography, illustrated exercise poses, clean timeline layout, motivational design style, gym equipment icons, progress tracker elements, modern sports design --ar 3:4',
'健身训练信息图：活力橙黑配色，运动粗体字，插画训练动作，清晰时间轴布局，健身器材图标，进度追踪元素',
SHA2('v13-info-fitness-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '信息图,健身,流程图,运动', 2, 'published', 2256, 389, 178, 48),

(3, '旅游目的地指南',
'Travel destination guide infographic, vibrant tropical color palette, illustrated map with landmarks, cute isometric icons for activities, timeline of best seasons to visit, photo spots marked with camera icons, playful hand-drawn style, Korean travel illustration aesthetic --ar 3:4',
'旅游指南信息图：活力热带配色，手绘地图+地标，可爱等距活动图标，最佳旅行季节时间轴，韩式旅行插画风格',
SHA2('v13-info-travel-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '信息图,旅游,指南,手绘', 3, 'published', 3102, 478, 234, 62),

-- ═══════════ 4. 角色设计 — 🦸 ═══════════
(4, '赛博朋克女侠角色',
'Full body character design of a cyberpunk female warrior, sleek black and neon purple tactical armor, holographic visor, mechanical arm with glowing blue circuits, dynamic action pose, street of futuristic Tokyo at night background, concept art style, anime influence --ar 2:3 --stylize 450',
'赛博朋克女战士角色设计：流线型黑紫战术装甲，全息面罩，机械臂蓝光线路，动态战斗姿势，未来东京夜景街道背景',
SHA2('v13-char-cyber-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '角色设计,赛博朋克,女性,概念艺术', 0, 'published', 6234, 891, 467, 134),

(4, '奇幻精灵弓箭手',
'Fantasy RPG character design, elegant wood elf archer, flowing silver hair with leaf ornaments, intricate green and gold leather armor, ornate longbow with magical runes glowing, forest clearing with ethereal light rays, D&D art style, full body illustration, painterly digital art --ar 2:3 --stylize 400',
'奇幻精灵弓箭手：优雅木精灵，银发叶饰，绿金皮甲精雕，符文发光长弓，林间空地灵光穿透，D&D画风全身立绘',
SHA2('v13-char-elf-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '角色设计,奇幻,精灵,RPG', 1, 'published', 4892, 756, 398, 108),

(4, '蒸汽朋克机械师',
'Steampunk character design, Victorian-era female mechanic, brass goggles pushed up on forehead, leather apron with copper tools, clockwork mechanical arm, warm amber lighting, industrial workshop background with gears and steam pipes, concept art --ar 2:3',
'蒸汽朋克机械师角色：维多利亚时代女技师，铜制护目镜，皮围裙铜工具，发条机械臂，暖琥珀光，齿轮蒸汽管工坊背景',
SHA2('v13-char-steam-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '角色设计,蒸汽朋克,机械,概念艺术', 2, 'published', 3156, 534, 267, 76),

(4, '日系校园角色三视图',
'Anime style character design reference sheet, Japanese high school student, three-view turnaround (front side back), detailed uniform design, multiple expression variants, natural black hair, clean line art with flat colors, character sheet layout with color palette swatches --ar 16:9',
'日系校园角色三视图：女高中生正侧背三视图，详细校服设定，多表情变体，黑发自然，干净线稿+平涂上色，角色设定表排版',
SHA2('v13-char-anime-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '角色设计,日系,三视图,动画', 3, 'published', 4123, 645, 356, 92),

-- ═══════════ 5. 游戏美术 — 🎮 ═══════════
(5, '像素风RPG村庄场景',
'Pixel art game scene, peaceful RPG village with cobblestone path, colorful tile-roofed houses, water mill by flowing stream, cherry blossom trees, 32-bit pixel art aesthetic, SNES era inspired, charming NPC characters scattered, warm sunset lighting, Stardew Valley meets Octopath Traveler style --ar 16:9',
'像素风RPG村庄：石径蜿蜒，彩瓦屋顶，溪边水车，樱花树点缀，32位像素美学，SFC时代灵感，星露谷×八方旅人风格',
SHA2('v13-game-pixel-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '游戏美术,像素,村庄,RPG', 0, 'published', 5678, 901, 456, 145),

(5, '暗黑地牢BOSS概念',
'Dark fantasy game boss concept art, colossal eldritch horror creature emerging from void, multiple glowing eyes, twisted organic armor plates, ancient ruins arena, dramatic purple and red volumetric lighting, particle effects of dark energy, Souls-like aesthetic, highly detailed matte painting, cinematic composition --ar 16:9 --stylize 700',
'暗黑游戏BOSS概念：巨型克苏鲁式怪物从虚空浮现，多只发光眼睛，扭曲有机装甲，古遗迹角斗场，紫红体积光，魂系美学',
SHA2('v13-game-boss-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '游戏美术,BOSS,暗黑,概念设计', 1, 'published', 8921, 1234, 678, 198),

(5, '开放世界草原场景',
'Open world game environment art, vast rolling grassland with wildflowers, ancient stone ruins on distant hill, dramatic cloudscape with god rays breaking through, herd of fantasy creatures grazing, Unreal Engine 5 Lumen lighting, photorealistic vegetation with dynamic wind effect, cinematic wide-angle --ar 16:9',
'开放世界场景美术：广阔起伏草原野花盛开，远山古遗迹，云隙光穿透云层，奇幻生物群，UE5 Lumen光照，写实植被动态风效',
SHA2('v13-game-open-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '游戏美术,开放世界,场景,UE5', 2, 'published', 7234, 1089, 567, 167),

(5, '赛博朋克酒吧内景',
'Isometric game environment, cyberpunk neon-lit underground bar, holographic advertisements on walls, futuristic bartender robot, diverse patrons at tables, volumetric lighting with pink and blue neon, detailed props, rainy street visible through window, Blade Runner meets Shadowrun aesthetic --ar 16:9',
'等距赛博朋克酒吧：霓虹地下酒吧，全息广告墙，机器人调酒师，多样的酒客，粉蓝体积光，窗外雨街可见，银翼杀手×暗影狂奔',
SHA2('v13-game-bar-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '游戏美术,赛博朋克,等距,场景', 3, 'published', 4567, 734, 398, 112),

-- ═══════════ 6. UI设计 — 🖥️ ═══════════
(6, '移动端音乐播放器',
'Modern music player mobile app UI design, dark mode with vibrant accent colors, album artwork with blurred background, waveform visualization, circular playback controls, smooth playlist cards with glass morphism effect, clean typography hierarchy, iOS Android dual platform, dribbble quality presentation --ar 9:16',
'音乐播放器UI：暗色模式活力强调色，专辑封面模糊背景，波形可视化，圆形播放控制，毛玻璃歌单卡片，iOS/Android双平台Dribbble级',
SHA2('v13-ui-music-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, 'UI设计,移动端,音乐,暗色模式', 0, 'published', 3456, 567, 298, 89),

(6, 'SaaS仪表盘界面',
'Professional SaaS analytics dashboard UI, dark theme with data visualization widgets, line charts showing upward trends, KPI cards with gradient backgrounds, sidebar navigation with icon set, clean data table with hover states, glass morphism containers, enterprise software quality --ar 16:9',
'SaaS分析仪表盘：暗色主题数据可视化组件，上升趋势折线图，渐变KPI卡片，图标侧栏导航，悬浮状态数据表，毛玻璃容器',
SHA2('v13-ui-dashboard-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, 'UI设计,仪表盘,SaaS,数据可视化', 1, 'published', 4567, 678, 356, 98),

(6, '电商首页设计',
'E-commerce fashion store homepage UI, warm beige and cream palette with rose gold accents, hero banner with model photography, product grid with hover zoom effect, elegant serif typography, clean card-based layout, subtle shadow elevations, luxury brand aesthetic, mobile-first responsive --ar 16:9',
'电商首页UI：暖米色奶油调+玫瑰金点缀，模特摄影Hero Banner，悬浮放大产品网格，优雅衬线字体，简约卡片布局，奢侈品牌美学',
SHA2('v13-ui-ecommerce-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, 'UI设计,电商,首页,时尚', 2, 'published', 2891, 456, 234, 67),

(6, '智能家居控制面板',
'Smart home control panel UI, futuristic minimal design, dark mode with neon green accents, circular temperature and energy gauges, room-by-room card interface, toggle switches with animation, live security camera feed widget, voice assistant integration, tablet-sized layout --ar 4:3',
'智能家居面板UI：未来极简设计，暗色+霓虹绿，圆形温控/能耗表盘，房间卡片界面，动画拨动开关，实时摄像头组件，语音助手集成',
SHA2('v13-ui-smarthome-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, 'UI设计,智能家居,物联网,暗色', 3, 'published', 1678, 312, 167, 45),

-- ═══════════ 7. 插画艺术 — 🖌️ ═══════════
(7, '治愈系森林小兽',
'Cozy illustration of woodland creatures having tea party, cute fox rabbit and owl around mushroom table, warm sunlight filtering through tree canopy, watercolor and gouache art style, Studio Ghibli inspired whimsical atmosphere, soft pastel colors, storybook illustration quality --ar 4:3 --stylize 350',
'治愈系森林插画：小狐狸兔子猫头鹰围蘑菇桌下午茶，树冠洒落暖阳，水彩不透明画风，吉卜力式奇幻氛围，粉彩童话质感',
SHA2('v13-illus-cozy-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '插画,治愈,动物,水彩', 0, 'published', 5123, 812, 423, 121),

(7, '抽象几何城市夜景',
'Abstract geometric illustration of city skyline at night, layered triangles and circles forming buildings, gradient sky from navy to magenta, glowing window patterns, retro-futuristic synthwave aesthetic, flat design with depth through layering, album cover art style --ar 1:1',
'抽象几何夜景：三角圆形层叠构建城市天际线，深蓝到品红渐变天空，发光窗户图案，复古未来合成波美学，专辑封面风格',
SHA2('v13-illus-abstract-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '插画,抽象,几何,夜景', 1, 'published', 2456, 423, 198, 56),

(7, '京剧脸谱新国风',
'Modern Chinese ink wash illustration of Beijing opera character, bold red and black brush strokes, flowing watercolor textures, gold leaf accents on costume details, dynamic pose with swirling fabric, traditional meets contemporary art style, red seal stamp signature, gallery quality --ar 3:4',
'新国风京剧插画：红黑粗犷笔触，墨韵流动水彩肌理，戏服金箔点缀，衣袂飘带动感姿态，传统×当代艺术融合，朱红印章落款',
SHA2('v13-illus-opera-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '插画,国风,京剧,水墨', 2, 'published', 3678, 589, 312, 87),

(7, '机械昆虫解剖图',
'Vintage scientific illustration of mechanical beetle, detailed anatomical breakdown showing gears and springs inside translucent shell, antique engraving style with sepia tones, labeled parts in elegant cursive, Da Vinci sketch aesthetic meets steampunk, cross-hatching texture, aged parchment background --ar 2:3',
'机械甲虫解剖复古插画：半透明壳下齿轮弹簧构造精细解剖，古铜版画风棕褐色调，优雅连笔标注，达芬奇手稿×蒸汽朋克',
SHA2('v13-illus-beetle-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '插画,机械,昆虫,复古', 3, 'published', 1876, 345, 178, 49),

-- ═══════════ 8. 排版设计 — 🔤 ═══════════
(8, '3D金属字体海报',
'3D rendered metallic typography, word DREAM in polished rose gold material, floating above dark reflective surface, dramatic studio lighting with soft shadows, particle dust around letters, ultra-realistic PBR materials, macro lens depth of field, luxury brand showcase, 8K --ar 16:9',
'3D金属字体：DREAM 抛光亮玫瑰金材质，悬浮暗色反光面，戏剧棚拍光+柔影，字母周围粒子尘埃，超写实PBR材质，8K细节',
SHA2('v13-type-3d-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '排版,3D,金属,字体设计', 0, 'published', 3245, 534, 287, 78),

(8, '可变字体实验排版',
'Experimental typography design, variable font weight from thin to black, creative letter overlapping, gradient color transitions through rainbow spectrum, Swiss style grid but deliberately broken, kinetic typography feel in static frame, editorial magazine spread quality --ar 3:2',
'实验排版：可变字体从细到粗，创意字母重叠，彩虹渐变过渡，瑞士网格故意打破，静态帧动感排版，编辑级杂志跨页',
SHA2('v13-type-variable-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '排版,可变字体,实验,编辑设计', 1, 'published', 2134, 378, 189, 52),

(8, '霓虹灯管字体',
'Neon sign typography, word TOKYO rendered as glowing glass tubes, vibrant cyan and magenta, brick wall background with atmospheric fog, realistic glass tube reflections, slight flicker effect, rainy street reflections below, urban night aesthetic, Blade Runner signage style --ar 16:9',
'霓虹灯管字体：TOKYO 发光玻璃管，活力青品红配色，砖墙背景+雾气，真实玻璃管反射，微闪效果，湿街倒影，银翼杀手招牌风',
SHA2('v13-type-neon-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '排版,霓虹,字体,赛博朋克', 2, 'published', 4567, 689, 345, 98),

(8, '传统书法与现代融合',
'East meets West typography, bold Chinese calligraphy brush character for "禅" combined with modern minimalist Latin serif, ink splash textures meeting clean vector geometry, black ink on textured rice paper with subtle gold foil accents, gallery-level art piece --ar 1:1',
'东西方排版融合：粗犷中文"禅"笔触×极简拉丁衬线，墨溅纹理×矢量几何，纹理宣纸金箔点缀，画廊级艺术作品',
SHA2('v13-type-calligraphy-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '排版,书法,东方,融合', 3, 'published', 2987, 489, 256, 72),

-- ═══════════ 9. 产品摄影 — 📦 ═══════════
(9, '香水瓶电商白底图',
'Premium product photography of luxury perfume bottle, crystal clear glass with amber liquid inside, diamond-cut cap catching light, pure white studio background, soft diffused lighting, subtle reflection on glossy surface, macro detail, commercial catalog quality, 100mm macro lens --ar 1:1',
'高端香水电商白底图：水晶玻璃瓶琥珀色液体，钻石切割瓶盖反光，纯白棚拍背景，柔光漫射，高光面微倒影，商业画册级',
SHA2('v13-product-perfume-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '产品摄影,香水,电商,白底', 0, 'published', 3892, 567, 312, 85),

(9, '科技产品场景图',
'Lifestyle product photography of wireless earbuds, morning sunlight on wooden desk, next to a cup of artisanal coffee and open notebook, warm lifestyle aesthetic, shallow depth of field, natural window light, premium tech lifestyle, Scandinavian interior style --ar 4:3',
'无线耳机生活场景图：晨光木桌，手冲咖啡旁翻开笔记本，暖调生活美学，浅景深自然窗光，高端科技生活方式，北欧室内风',
SHA2('v13-product-earbuds-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '产品摄影,科技,场景,生活方式', 1, 'published', 5234, 789, 423, 112),

(9, '运动鞋创意悬浮拍摄',
'Creative sneaker photography, floating athletic shoe with exploding color powder, dynamic motion frozen mid-air, dramatic blue and orange lighting, water splash elements around shoe, high-speed photography aesthetic, detailed fabric texture, commercial quality --ar 1:1',
'运动鞋创意悬浮：浮空鞋炸裂彩粉，动态瞬间凝固，戏剧蓝橙布光，水花环绕鞋身，高速摄影美学，面料纹理精细',
SHA2('v13-product-sneaker-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '产品摄影,运动鞋,创意,悬浮', 2, 'published', 6789, 945, 512, 156),

(9, '珠宝微距钻戒',
'Luxury diamond ring macro photography, single brilliant cut diamond on platinum band, extreme close-up showing facet details, soft romantic bokeh with candlelight reflections, jewelry catalog quality, tilt-shift effect, velvet surface, 100mm f/2.8 macro --ar 1:1',
'珠宝微距钻戒：单颗明亮切割铂金钻戒，极微距切面细节，烛光柔和浪漫散景，珠宝画册品质，移轴效果，丝绒底面',
SHA2('v13-product-ring-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '产品摄影,珠宝,钻戒,微距', 3, 'published', 7234, 1023, 567, 178),

-- ═══════════ 10. 风景摄影 — 🏔️ ═══════════
(10, '冰岛极光与瀑布',
'Epic landscape photography, massive waterfall under dancing aurora borealis, Iceland winter, green and purple northern lights reflecting in water pool, long exposure silky water, snow-covered volcanic rocks, starry night sky, wide-angle 14mm, National Geographic quality --ar 16:9',
'冰岛极光瀑布：巨瀑之上升起舞动极光，绿紫色极光倒映水潭，长曝光丝绸流水，雪覆火山岩，星空夜幕，14mm广角国家地理级',
SHA2('v13-landscape-aurora-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '风景,极光,瀑布,冰岛', 0, 'published', 8923, 1345, 678, 198),

(10, '日本竹林晨曦',
'Misty bamboo forest at sunrise in Kyoto Japan, golden morning light piercing through dense bamboo stalks, atmospheric fog creating depth layers, stone path winding through forest, zen garden aesthetic, 24mm wide angle, Fujifilm Velvia film colors --ar 4:3',
'京都竹林晨曦：金色晨光穿透密竹，雾霭层层纵深，石径蜿蜒林间，禅意庭园美学，24mm广角富士Velvia色彩',
SHA2('v13-landscape-bamboo-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '风景,竹林,日本,晨曦', 1, 'published', 6234, 912, 456, 134),

(10, '阿尔卑斯山镜湖',
'Mirror reflection landscape, crystal clear alpine lake perfectly reflecting snow-capped mountain peak, Swiss Alps, pink sunrise sky, still water surface, lone wooden dock extending into lake, minimalist composition, medium format Hasselblad aesthetic --ar 3:2',
'阿尔卑斯镜湖：水晶般清澈高山湖完美倒映雪峰，瑞士阿尔卑斯粉红日出，静水面独木码头延伸湖中，极简构图哈苏中画幅',
SHA2('v13-landscape-alps-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '风景,镜湖,雪山,阿尔卑斯', 2, 'published', 5123, 789, 423, 121),

(10, '沙漠星空延时夜景',
'Milky Way arching over desert sand dunes, crystal clear galaxy core visible, warm campfire glow in foreground with silhouetted tent, long exposure astrophotography, star trail suggestion, red sand ripples lit by moonlight, 14mm f/1.8 lens --ar 2:1',
'沙漠银河拱桥：银河核心清晰可见横跨沙丘，前景篝火暖光+帐篷剪影，长曝光天文摄影，星轨若隐若现，月光照红沙波纹',
SHA2('v13-landscape-desert-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '风景,星空,沙漠,天文摄影', 3, 'published', 4123, 678, 345, 98),

(10, '托斯卡纳金色田野',
'Golden hour landscape of Tuscany Italy, rolling hills with cypress trees lining winding road, wheat fields glowing in warm sunset light, isolated farmhouse on hilltop, painterly atmosphere like Monet, telephoto compression layers, fine art landscape --ar 3:2',
'托斯卡纳金色田野：起伏丘陵丝柏列道蜿蜒，麦田暖金落日辉光，山顶孤农舍，莫奈式油画氛围，长焦压缩层次感',
SHA2('v13-landscape-tuscany-005', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '风景,托斯卡纳,金色,田园', 4, 'published', 3245, 567, 278, 82),

-- ═══════════ 11. Logo设计 — ⭕ ═══════════
(11, '几何科技公司Logo',
'Minimalist geometric logo design for technology startup, abstract hexagon made of gradient blue triangles forming a stylized letter A, clean sharp lines, dark background, professional brand identity presentation, multiple color variations, modern tech brand aesthetic --ar 1:1',
'几何科技Logo：渐变蓝色三角组成抽象六边形字母A，干净锐利线条，深色背景展示，多色方案呈现，现代科技品牌美学',
SHA2('v13-logo-geo-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, 'Logo,科技,几何,极简', 0, 'published', 2456, 423, 198, 56),

(11, '咖啡品牌复古Logo',
'Vintage coffee shop logo design, hand-drawn coffee bean illustration with elegant serif text, circular badge style with ornate border, warm brown and cream color palette, established date ribbon, artisanal hipster aesthetic, letterpress texture --ar 1:1',
'咖啡复古Logo：手绘咖啡豆×优雅衬线字，圆形徽章繁复边框，暖棕奶油配色，创始年份绶带，手工匠人美学，凸版印刷质感',
SHA2('v13-logo-coffee-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, 'Logo,咖啡,复古,手绘', 1, 'published', 3123, 534, 267, 78),

(11, '运动品牌抽象Logo',
'Abstract dynamic sports brand logo, flowing ribbon shapes suggesting speed and movement, gradient orange to red color scheme, minimal swoosh-like form, negative space creating hidden arrow, bold athletic aesthetic, multiple lockup variations --ar 1:1',
'运动品牌Logo：流动丝带形态暗示速度动感，橙红渐变配色，极简弧线造型，负空间隐含箭头，粗犷运动美学，多组合方式',
SHA2('v13-logo-sports-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, 'Logo,运动,抽象,品牌', 2, 'published', 1876, 356, 178, 52),

(11, '自然护肤品牌Logo',
'Organic skincare brand logo, delicate botanical line art of wild rose, elegant minimalist serif typography, soft sage green and blush pink palette, circular composition with leaves framing brand name, Aesop-inspired refined simplicity, beauty industry quality --ar 1:1',
'护肤品牌Logo：野玫瑰精致植物线描，优雅极简衬线字体，柔和鼠尾草绿+腮红粉配色，圆形构图的叶片环绕品牌名',
SHA2('v13-logo-skincare-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, 'Logo,护肤,自然,优雅', 3, 'published', 2234, 398, 189, 61),

-- ═══════════ 12. 图像编辑 — ✂️ ═══════════
(12, '白天变夜景编辑',
'Day-to-night architecture photo transformation, convert daytime building photo to magical blue hour scene, all windows glowing warm yellow, starry sky gradually appearing, street lamps turning on, cinematic color grade shift from warm to cool tones --ar 16:9',
'日转夜建筑编辑：白天建筑→魔幻蓝调时刻，所有窗户暖黄发光，星空渐显，路灯点亮，电影级暖转冷调色',
SHA2('v13-edit-daynight-001', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '图像编辑,日夜转换,建筑,调色', 0, 'published', 1567, 289, 134, 42),

(12, '季节转换秋季滤镜',
'Season transformation photo edit, summer green landscape to autumn colors, vibrant red orange and gold foliage, warm golden hour lighting added, shallow mist on ground, dramatic sky enhancement, cinematic color grading with teal shadows --ar 3:2',
'夏转秋滤镜：夏季绿景→秋色斑斓，红橙金叶茂盛，暖金时刻光效叠加，地面薄雾，天空戏剧化增强，青影电影调色',
SHA2('v13-edit-autumn-002', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '图像编辑,季节转换,秋季,调色', 1, 'published', 1987, 345, 167, 48),

(12, '老照片修复上色',
'Vintage black and white photo restoration and colorization, 1950s family portrait brought to life, historically accurate colors, maintained original film grain, subtle aging removal, natural skin tones, warm nostalgic atmosphere, museum archive quality --ar 3:4',
'老照片修复上色：1950年代黑白全家福→彩色新生，历史准确配色，保留原胶片颗粒，自然肤色，温暖怀旧氛围，馆藏级',
SHA2('v13-edit-restore-003', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '图像编辑,修复,上色,老照片', 2, 'published', 2345, 412, 198, 56),

(12, '产品图背景替换',
'Product photo background replacement, isolated white background product seamlessly placed into lifestyle setting, natural lighting matching, realistic shadow and reflection recreation, professional e-commerce retouching quality, clean compositing --ar 1:1',
'产品背景替换：白底抠出产品无缝融入生活场景，自然光匹配，真实阴影倒影重建，专业电商修图级合成',
SHA2('v13-edit-bgreplace-004', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '图像编辑,背景替换,抠图,合成', 3, 'published', 3123, 489, 234, 67),

(12, '素描风格转换',
'Photo to pencil sketch artistic conversion, realistic graphite drawing style from portrait photo, detailed shading with cross-hatching technique, visible pencil stroke texture on rough paper, artistic interpretation while maintaining likeness, professional artist quality --ar 3:4',
'照片转素描：真人照片→逼真石墨素描风格，精细交叉排线明暗，糙纸铅笔笔触纹理可见，保持相似度的艺术诠释',
SHA2('v13-edit-sketch-005', 256), '图灵绘境精选', '', 'Curated', 'zh', 0, '图像编辑,素描,风格转换,艺术', 4, 'published', 1876, 334, 156, 45);

-- 更新分类提示词计数
UPDATE prompt_categories SET prompt_count = (
  SELECT COUNT(*) FROM prompt_library WHERE prompt_library.category_id = prompt_categories.id AND prompt_library.status = 'published'
);
