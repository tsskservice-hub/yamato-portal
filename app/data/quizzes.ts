// src/data/quizzes.ts

export type QuizItem = {
  id: string;
  topic: string;
  date?: string; // 日付指定は任意（必要に応じて残す・削除可能）
  question: string;
  options: string[];
  answer: number; // 正解のインデックス (0始まり)
  explanation: string;
  images?: string[];
};

export const DAILY_QUIZZES: QuizItem[] = [
  // --- 1. 食べ物 (Food) ---
  {
    id: "food-001",
    topic: "Food",
    question: "Which of the following is a traditional Japanese dish consisting of vinegared rice combined with various ingredients, such as seafood and vegetables?",
    options: ["Ramen", "Tempura", "Sushi", "Okonomiyaki"],
    answer: 2,
    explanation: "Sushi is a traditional Japanese dish featuring vinegared rice combined with raw or cooked seafood and various toppings."
  },
  {
    id: "food-002",
    topic: "Food",
    question: "What is the name of the popular Japanese dish made of wheat noodles served in a meat or fish-based broth, often topped with sliced pork and green onions?",
    options: ["Udon", "Soba", "Ramen", "Somen"],
    answer: 2,
    explanation: "Ramen is a beloved noodle soup dish of Chinese origin that has become a staple of modern Japanese cuisine."
  },
  {
    id: "food-003",
    topic: "Food",
    question: "Which Japanese dish features seafood and vegetables that have been battered and deep-fried?",
    options: ["Yakitori", "Tempura", "Tonkatsu", "Gyoza"],
    answer: 1,
    explanation: "Tempura consists of seafood or vegetables that are coated in a light, airy batter and deep-fried to a crisp."
  },

  // --- 2. 飲み物 (Drink) ---
  {
    id: "drink-001",
    topic: "Drink",
    question: "What is the traditional Japanese alcoholic beverage made from fermented rice called?",
    options: ["Shochu", "Sake", "Awamori", "Umeshu"],
    answer: 1,
    explanation: "Sake (or Nihonshu) is a traditional brewed alcoholic drink made from fermented rice."
  },
  {
    id: "drink-002",
    topic: "Drink",
    question: "Which type of green tea is powdered and used extensively in the traditional Japanese tea ceremony?",
    options: ["Sencha", "Genmaicha", "Matcha", "Hojicha"],
    answer: 2,
    explanation: "Matcha is finely ground powder of specially grown and processed green tea leaves, famous for its use in tea ceremonies."
  },
  {
    id: "drink-003",
    topic: "Drink",
    question: "What is 'Umeshu' in Japanese drink culture?",
    options: ["Sweet plum liqueur", "Barley tea", "Fermented milk drink", "Rice-based sweet soup"],
    answer: 0,
    explanation: "Umeshu is a popular Japanese liqueur made by steeping fresh green ume plums in liquor and sugar."
  },

  // --- 3. 乗り物 (Vehicle) ---
  {
    id: "vehicle-001",
    topic: "Vehicle",
    question: "What is the name of Japan's famous high-speed bullet train network?",
    options: ["Romancecar", "Shinkansen", "Rapid Express", "Limited Express"],
    answer: 1,
    explanation: "The Shinkansen is a network of high-speed railway lines in Japan operated by four Japan Railways Group companies."
  },
  {
    id: "vehicle-002",
    topic: "Vehicle",
    question: "Which iconic mountain can often be seen from the windows of the Tokaido Shinkansen near Fuji City?",
    options: ["Mount Aso", "Mount Tate", "Mount Fuji", "Mount Hotaka"],
    answer: 2,
    explanation: "Mount Fuji is clearly visible from the Tokaido Shinkansen line, especially around Shin-Fuji station."
  },
  {
    id: "vehicle-003",
    topic: "Vehicle",
    question: "What are the small, iconic, box-shaped light passenger cars unique to Japan called, which offer tax and insurance benefits?",
    options: ["Kei car", "Sedan", "Hatchback", "Minivan"],
    answer: 0,
    explanation: "Kei cars (Keijidosha) are a category of small light automobiles in Japan with engine displacement and dimension limits."
  },

  // --- 4. 城 (Castle) ---
  {
    id: "castle-001",
    topic: "Castle",
    question: "Which famous Japanese castle is nicknamed the 'White Heron Castle' due to its elegant white exterior?",
    options: ["Osaka Castle", "Matsumoto Castle", "Himeji Castle", "Kumamoto Castle"],
    answer: 2,
    explanation: "Himeji Castle is frequently referred to as Hakuro-jo ('White Heron Castle') because of its brilliant white plastered walls."
  },
  {
    id: "castle-002",
    topic: "Castle",
    question: "Which castle, located in Nagano Prefecture, is one of Japan's oldest surviving black-painted wooden castles, known as the 'Crow Castle'?",
    options: ["Matsumoto Castle", "Inuyama Castle", "Hikone Castle", "Hirosaki Castle"],
    answer: 0,
    explanation: "Matsumoto Castle is known as the 'Crow Castle' (Karasu-jo) because of its striking black walls and roofs."
  },
  {
    id: "castle-003",
    topic: "Castle",
    question: "In which prefecture is Kumamoto Castle located, which is famous for its massive stone walls and history?",
    options: ["Fukuoka", "Kumamoto", "Kagoshima", "Oita"],
    answer: 1,
    explanation: "Kumamoto Castle is located in Kumamoto Prefecture on the island of Kyushu and is one of the premier castles in Japan."
  },

  // --- 5. 花 (Flower) ---
  {
    id: "flower-001",
    topic: "Flower",
    question: "Which flower is considered the national flower of Japan and blooms brilliantly in spring?",
    options: ["Chrysanthemum", "Sakura (Cherry Blossom)", "Plum Blossom", "Lotus"],
    answer: 1,
    explanation: "Sakura (cherry blossom) is deeply symbolic in Japanese culture, representing spring, renewal, and the ephemeral nature of life."
  },
  {
    id: "flower-002",
    topic: "Flower",
    question: "Which flower, known as 'Kiku' in Japanese, appears on the Imperial Seal of Japan and represents autumn?",
    options: ["Hydrangea", "Chrysanthemum", "Sunflower", "Camellia"],
    answer: 1,
    explanation: "The chrysanthemum (Kiku) is the crest of the Japanese Emperor and holds deep historical significance."
  },
  {
    id: "flower-003",
    topic: "Flower",
    question: "Which seasonal flower is famous for blooming during the rainy season (June) in Japan, often found at temple gardens like Kamakura?",
    options: ["Cosmos", "Hydrangea (Ajisai)", "Tulip", "Rapeseed blossom"],
    answer: 1,
    explanation: "Hydrangeas (Ajisai) bloom during Japan's rainy season (Tsuyu) and thrive in damp conditions."
  },

  // --- 6. 音楽 (Music) ---
  {
    id: "music-001",
    topic: "Music",
    question: "What is the name of the traditional three-stringed Japanese musical instrument played with a large plectrum called a bachi?",
    options: ["Koto", "Shakuhachi", "Shamisen", "Biwa"],
    answer: 2,
    explanation: "Shamisen is a traditional three-stringed, lute-like Japanese musical instrument."
  },
  {
    id: "music-002",
    topic: "Music",
    question: "What is a 'Koto' in traditional Japanese music?",
    options: ["A long zither with 13 strings", "A bamboo flute", "A wooden drum", "A plucked lute"],
    answer: 0,
    explanation: "The Koto is a traditional stringed instrument played by plucking thirteen strings stretched over movable bridges."
  },
  {
    id: "music-003",
    topic: "Music",
    question: "What is 'Enka' in the context of Japanese music genres?",
    options: ["Fast-paced electronic dance music", "A popular style of sentimental ballad singing", "Traditional Buddhist chanting", "Japanese hip-hop"],
    answer: 1,
    explanation: "Enka is a popular Japanese music genre that resembles traditional styling in its vocal delivery, often expressing melancholy or emotional themes."
  },

  // --- 7. アニメ (Anime) ---
  {
    id: "anime-001",
    topic: "Anime",
    question: "Which globally renowned animation studio was co-founded by Hayao Miyazaki and Isao Takahata?",
    options: ["Kyoto Animation", "Studio Ghibli", "ufotable", "MAPPA"],
    answer: 1,
    explanation: "Studio Ghibli is an iconic Japanese animation film studio famous for masterpieces like 'Spirited Away' and 'My Neighbor Totoro'."
  },
  {
    id: "anime-002",
    topic: "Anime",
    question: "In the anime 'Dragon Ball', what is the name of the main protagonist who embarks on a quest to gather the mystical dragon balls?",
    options: ["Sasuke", "Goku", "Luffy", "Naruto"],
    answer: 1,
    explanation: "Son Goku is the iconic main character of the Dragon Ball franchise created by Akira Toriyama."
  },
  {
    id: "anime-003",
    topic: "Anime",
    question: "Which anime series features a high school student named Light Yagami who finds a notebook that kills anyone whose name is written in it?",
    options: ["Bleach", "One Piece", "Death Note", "Attack on Titan"],
    answer: 2,
    explanation: "Death Note is a psychological thriller anime centered around the supernatural notebook found by Light Yagami."
  },

  // --- 8. ゲーム (Game) ---
  {
    id: "game-001",
    topic: "Game",
    question: "Which iconic video game franchise, created by Shigeru Miyamoto for Nintendo, features plumbers named Mario and Luigi?",
    options: ["The Legend of Zelda", "Super Mario", "Metroid", "Pokemon"],
    answer: 1,
    explanation: "Super Mario is one of the best-selling and most influential video game franchises of all time created by Nintendo."
  },
  {
    id: "game-002",
    topic: "Game",
    question: "What was the best-selling home video game console released by Sony Interactive Entertainment in 1994?",
    options: ["PlayStation 2", "PlayStation", "PSP", "PlayStation 3"],
    answer: 1,
    explanation: "The original PlayStation launched in Japan in December 1994 and revolutionized the 3D gaming industry."
  },
  {
    id: "game-003",
    topic: "Game",
    question: "Which media franchise created by Satoshi Tajiri involves catching, training, and battling fictional creatures called 'pocket monsters'?",
    options: ["Digimon", "Monster Hunter", "Pokémon", "Yo-kai Watch"],
    answer: 2,
    explanation: "Pokémon is a massive global entertainment franchise managed by The Pokémon Company, centering on creatures called Pokémon."
  },

  // --- 9. 動物 (Animal) ---
  {
    id: "animal-001",
    topic: "Animal",
    question: "Which species of macaque is famous for bathing in natural hot springs (onsen) in Nagano Prefecture during winter?",
    options: ["Japanese macaque (Snow monkey)", "Rhesus macaque", "Barbary macaque", "Pig-tailed macaque"],
    answer: 0,
    explanation: "The Japanese macaque, often called the snow monkey, is renowned for visiting Jigokudani Monkey Park to warm up in hot springs."
  },
  {
    id: "animal-002",
    topic: "Animal",
    question: "Which small, endangered mammal native to the mountains of central Japan is known as the 'mountain-dwelling ghost' and is a special natural monument?",
    options: ["Japanese serow (Kamoshika)", "Tanuki", "Red Fox", "Sika deer"],
    answer: 0,
    explanation: "The Japanese serow (Nihon-kamoshika) is a goat-antelope endemic to Japan, legally designated as a special natural monument."
  },
  {
    id: "animal-003",
    topic: "Animal",
    question: "On which Japanese island can you find hundreds of free-roaming sika deer wandering around historic shrines and parks?",
    options: ["Hokkaido", "Miyajima", "Sado", "Okinawa"],
    answer: 1,
    explanation: "Miyajima (Itsukushima) and Nara Park are famous for their large populations of friendly, free-roaming sika deer."
  },

  // --- 10. 山 (Mountain) ---
  {
    id: "mountain-001",
    topic: "Mountain",
    question: "What is the highest mountain in Japan, standing at 3,776 meters?",
    options: ["Mount Kita", "Mount Hotaka", "Mount Fuji", "Mount Ontake"],
    answer: 2,
    explanation: "Mount Fuji is an active stratovolcano and the highest peak in Japan, revered as a sacred site."
  },
  {
    id: "mountain-002",
    topic: "Mountain",
    question: "Along with Mount Fuji and Mount Tate, which mountain is considered one of Japan's 'Three Holy Mountains' (Sanreizan)?",
    options: ["Mount Hiei", "Mount Hakusan", "Mount Aso", "Mount Kirishima"],
    answer: 1,
    explanation: "Mount Hakusan, alongside Mount Fuji and Mount Tate, is traditionally counted as one of Japan's three holy mountains."
  },
  {
    id: "mountain-003",
    topic: "Mountain",
    question: "In which region of Japan is the famous Daisetsuzan Volcanic Group located, known for being the first place to see autumn leaves?",
    options: ["Hokkaido", "Tohoku", "Shikoku", "Kyushu"],
    answer: 0,
    explanation: "Daisetsuzan is a large volcanic mountain group in the center of Hokkaido, Japan's northernmost prefecture."
  },

  // --- 11. 川 (River) ---
  {
    id: "river-001",
    topic: "River",
    question: "Which river is the longest river in Japan, flowing through Nagano and Niigata prefectures?",
    options: ["Tone River", "Shinano River", "Ishikari River", "Yoshino River"],
    answer: 1,
    explanation: "The Shinano River is the longest river in Japan, measuring approximately 367 kilometers in length."
  },
  {
    id: "river-002",
    topic: "River",
    question: "Which river, located in the Kanto region, has the largest catchment area of any river in Japan and flows into Tokyo Bay?",
    options: ["Sumida River", "Tone River", "Tama River", "Arakawa River"],
    answer: 1,
    explanation: "The Tone River has the largest basin area of all rivers in Japan and is historically referred to as 'Chisaburo-ro'."
  },
  {
    id: "river-003",
    topic: "River",
    question: "Which river flows through Kyoto and is famous for its scenic banks lined with cherry trees and traditional restaurants?",
    options: ["Kamo River (Kamogawa)", "Yodogawa River", "Uji River", "Hozu River"],
    answer: 0,
    explanation: "The Kamo River runs right through central Kyoto and is a popular relaxation spot for locals and visitors alike."
  },

  // --- 12. 魚 (Fish) ---
  {
    id: "fish-001",
    topic: "Fish",
    question: "What is the Japanese name for the prized Bluefin Tuna, which is a delicacy commonly served as sushi and sashimi?",
    options: ["Maguro", "Sake", "Tai", "Aji"],
    answer: 0,
    explanation: "Maguro refers to tuna in Japanese cuisine, with Bluefin tuna (Hon-maguro) being particularly prized."
  },
  {
    id: "fish-002",
    topic: "Fish",
    question: "Which fish, known as 'Tai' in Japanese, is traditionally served during celebratory occasions like weddings and New Year due to its auspicious name?",
    options: ["Red Snapper (Sea Bream)", "Salmon", "Yellowtail", "Mackerel"],
    answer: 0,
    explanation: "Tai (Sea Bream) is considered an auspicious fish in Japan because its name sounds similar to 'medetai' (celebratory/auspicious)."
  },
  {
    id: "fish-003",
    topic: "Fish",
    question: "What is the Japanese term for Pacific Saury, a seasonal fish that is grilled whole and eaten during autumn?",
    options: ["Sanma", "Katsuo", "Saba", "Iwashi"],
    answer: 0,
    explanation: "Sanma (Pacific Saury) is a symbol of autumn in Japanese culinary culture, typically enjoyed grilled with grated daikon radish."
  },

  // --- 13. 季節 (Season) ---
  {
    id: "season-001",
    topic: "Season",
    question: "What is the traditional Japanese custom of viewing blooming cherry blossoms in spring called?",
    options: ["Yukimi", "Hanami", "Tsukimi", "Momijigari"],
    answer: 1,
    explanation: "Hanami literally means 'flower viewing' and traditionally refers to gathering under blooming sakura trees in spring."
  },
  {
    id: "season-002",
    topic: "Season",
    question: "What is the name of the rainy season that typically occurs in early summer across most of Japan?",
    options: ["Koyo", "Tsuyu (Baiu)", "Shin-ryoku", "Kishitsu"],
    answer: 1,
    explanation: "Tsuyu (the rainy season) brings persistent rain across much of Japan from May/June to mid-July."
  },
  {
    id: "season-003",
    topic: "Season",
    question: "What is the autumn tradition of viewing changing red and yellow maple leaves called in Japanese?",
    options: ["Hanami", "Momijigari", "Yukimi", "Natsumatsuri"],
    answer: 1,
    explanation: "Momijigari translates to 'red leaf hunting' or autumn foliage viewing, a popular pastime in autumn."
  },

  // --- 14. 学校 (School) ---
  {
    id: "school-001",
    topic: "School",
    question: "In which month does the official academic and fiscal year typically begin in Japan?",
    options: ["January", "April", "September", "October"],
    answer: 1,
    explanation: "The Japanese school and corporate fiscal year begins in April, coinciding with the blooming of cherry blossoms."
  },
  {
    id: "school-002",
    topic: "School",
    question: "What are the indoor footwear called that Japanese students must change into when entering their school building?",
    options: ["Geta", "Uwabaki", "Zori", "Setta"],
    answer: 1,
    explanation: "Uwabaki are lightweight slip-on shoes worn exclusively indoors at Japanese schools to keep floors clean."
  },
  {
    id: "school-003",
    topic: "School",
    question: "What is the name of the mandatory physical education and school sports festival held annually in Japanese schools?",
    options: ["Bunkasai", "Undokai (Sports Day)", "Shugaku-ryoko", "Sotsugyoshiki"],
    answer: 1,
    explanation: "Undokai is a traditional sports festival where students compete in track-and-field events, relay races, and tug-of-war."
  },

  // --- 15. 海 (Sea / Ocean) ---
  {
    id: "sea-001",
    topic: "Sea",
    question: "Which warm ocean current flows northeastward off the coast of Japan, significantly influencing its climate?",
    options: ["Oyashio Current", "Kuroshio Current", "California Current", "Peru Current"],
    answer: 1,
    explanation: "The Kuroshio Current (Black Current) is a warm ocean current on the west side of the North Pacific Ocean."
  },
  {
    id: "sea-002",
    topic: "Sea",
    question: "Which sea lies between the Japanese archipelago and the Asian mainland?",
    options: ["East China Sea", "Sea of Japan (East Sea)", "Philippine Sea", "Bering Sea"],
    answer: 1,
    explanation: "The Sea of Japan borders Japan to the west, separating it from the Korean Peninsula and Russia."
  },
  {
    id: "sea-003",
    topic: "Sea",
    question: "Which southern Japanese prefecture is world-famous for its tropical coral reefs, crystal-clear turquoise waters, and unique island culture?",
    options: ["Hokkaido", "Okinawa", "Niigata", "Aomori"],
    answer: 1,
    explanation: "Okinawa Prefecture consists of subtropical islands famous for pristine beaches, coral reefs, and unique heritage."
  },

  // --- 16. 車 (Car) ---
  {
    id: "car-001",
    topic: "Car",
    question: "On which side of the road do vehicles drive in Japan?",
    options: ["Right side", "Left side", "Middle", "It varies by prefecture"],
    answer: 1,
    explanation: "Vehicles in Japan drive on the left side of the road, and steering wheels are typically positioned on the right side."
  },
  {
    id: "car-002",
    topic: "Car",
    question: "Which Japanese automobile manufacturer is currently the largest car manufacturer in the world by vehicle sales?",
    options: ["Honda", "Nissan", "Toyota", "Mazda"],
    answer: 2,
    explanation: "Toyota Motor Corporation is headquartered in Aichi Prefecture and is one of the world's leading automakers."
  },
  {
    id: "car-003",
    topic: "Car",
    question: "What is the famous Japanese iconic rotary-engine sports car produced by Mazda?",
    options: ["GT-R", "Supra", "RX-7", "NSX"],
    answer: 2,
    explanation: "The Mazda RX-7 is a legendary sports car powered by a compact, high-revving rotary Wankel engine."
  },

  // --- 17. 肉 (Meat) ---
  {
    id: "meat-001",
    topic: "Meat",
    question: "Which world-famous brand of Japanese beef comes from black-haired cattle raised in Hyogo Prefecture?",
    options: ["Matsusaka beef", "Kobe beef", "Omi beef", "Yonezawa beef"],
    answer: 1,
    explanation: "Kobe beef is world-renowned for its exquisite flavor, tenderness, and well-marbled fat from Tajima cattle in Hyogo."
  },
  {
    id: "meat-002",
    topic: "Meat",
    question: "What is Japanese skewered and grilled chicken, seasoned with sweet soy sauce or salt, called?",
    options: ["Tempura", "Yakitori", "Tonkatsu", "Sukiyaki"],
    answer: 1,
    explanation: "Yakitori consists of bite-sized chicken pieces grilled over charcoal on bamboo skewers."
  },
  {
    id: "meat-003",
    topic: "Meat",
    question: "What is the popular Japanese comfort food made of thinly sliced pork, coated in breadcrumbs and deep-fried?",
    options: ["Karaage", "Tonkatsu", "Gyudon", "Shabu-shabu"],
    answer: 1,
    explanation: "Tonkatsu is a breaded, deep-fried pork cutlet, typically served shredded cabbage and savory tonkatsu sauce."
  },

  // --- 18. 野菜 (Vegetable) ---
  {
    id: "veg-001",
    topic: "Vegetable",
    question: "What is the long, white root vegetable that is a staple of Japanese cooking and often grated into condiments?",
    options: ["Daikon radish", "Kabocha squash", "Renkon lotus root", "Goya"],
    answer: 0,
    explanation: "Daikon is a mild-flavored winter radish widely used in salads, soups, stews, and as grated garnish (daikon oroshi)."
  },
  {
    id: "veg-002",
    topic: "Vegetable",
    question: "What is 'Kabocha' in Japanese cuisine?",
    options: ["Japanese pumpkin (winter squash)", "Sweet potato", "Eggplant", "Burdock root"],
    answer: 0,
    explanation: "Kabocha is a type of Japanese winter squash characterized by its sweet flavor, firm texture, and dark green skin."
  },
  {
    id: "veg-003",
    topic: "Vegetable",
    question: "What is the name of the bitter green gourd that is a staple ingredient in Okinawan cuisine (such as in chanpuru)?",
    options: ["Shishito", "Goya (Bitter melon)", "Komatsuna", "Mibuna"],
    answer: 1,
    explanation: "Goya (bitter melon) is famous for its distinct bitter taste and is packed with vitamins, featured in Okinawan stir-fries."
  },

  // --- 19. 貨幣 (Currency) ---
  {
    id: "curr-001",
    topic: "Currency",
    question: "What is the official currency of Japan?",
    options: ["Yuan", "Won", "Yen", "Ringgit"],
    answer: 2,
    explanation: "The Yen (¥) is the official currency of Japan, denoted by the ISO currency code JPY."
  },
  {
    id: "curr-002",
    topic: "Currency",
    question: "Which iconic building or structure is featured on the back of the Japanese 10-yen coin?",
    options: ["Byodoin Temple (Phoenix Hall)", "Kinkaku-ji (Golden Pavilion)", "Tokyo Tower", "Osaka Castle"],
    answer: 0,
    explanation: "The Phoenix Hall of Byodoin Temple in Uji, Kyoto, is depicted on the reverse side of the 10-yen bronze coin."
  },
  {
    id: "curr-003",
    topic: "Currency",
    question: "Which plant branch features prominently on the 500-yen coin alongside paulownia and mandarin orange?",
    options: ["Bamboo", "Pine branch", "Cherry blossom", "Rice plant leaves"],
    answer: 1,
    explanation: "The 500-yen coin features paulownia, mandarin orange, and bamboo leaves engraved on its surface."
  },

  // --- 20. 侍 (Samurai) ---
  {
    id: "samurai-001",
    topic: "Samurai",
    question: "What was the traditional curved sword worn by samurai in feudal Japan called?",
    options: ["Kama", "Katana", "Kunai", "Nunchaku"],
    answer: 1,
    explanation: "The Katana is a traditionally made Japanese sword used by the samurai class of feudal Japan."
  },
  {
    id: "samurai-002",
    topic: "Samurai",
    question: "What was the unwritten samurai code of conduct emphasizing honor, discipline, and loyalty called?",
    options: ["Bushido", "Seppuku", "Shinto", "Zen"],
    answer: 0,
    explanation: "Bushido ('the way of the warrior') was the moral code and lifestyle adopted by the samurai."
  },
  {
    id: "samurai-003",
    topic: "Samurai",
    question: "What was the term for ritual suicide by disembowelment practiced by samurai to restore honor?",
    options: ["Kamikaze", "Seppuku (Harakiri)", "Ronin", "Shogun"],
    answer: 1,
    explanation: "Seppuku (or harakiri) was a form of ritual suicide performed by samurai to preserve personal and family honor."
  },

  // --- 21. 挨拶 (Greeting) ---
  {
    id: "greet-001",
    topic: "Greeting",
    question: "What is the Japanese greeting used when meeting someone in the morning?",
    options: ["Konnichiwa", "Ohayou gozaimasu", "Konbanwa", "Oyasumi nasai"],
    answer: 1,
    explanation: "'Ohayou gozaimasu' is the polite greeting used in Japan to say 'Good morning'."
  },
  {
    id: "greet-002",
    topic: "Greeting",
    question: "What phrase do Japanese people traditionally say before eating a meal to express gratitude to nature and cooks?",
    options: ["Itadakimasu", "Gochisousama deshita", "Oishii desu", "Ittekimasu"],
    answer: 0,
    explanation: "'Itadakimasu' is said before meals, expressing appreciation for the lives of plants/animals and the effort of providers."
  },
  {
    id: "greet-003",
    topic: "Greeting",
    question: "What should you say when returning home after being out?",
    options: ["Ittekimasu", "Tadaima", "Okaerinasai", "Irasshaimase"],
    answer: 1,
    explanation: "'Tadaima' means 'I'm home', to which family members inside reply 'Okaerinasai' ('Welcome back')."
  },

  // --- 22. 食文化 (Food Culture) ---
  {
    id: "cul-001",
    topic: "Food Culture",
    question: "What is the traditional UNESCO-recognized Japanese culinary culture centered around respect for nature and fresh ingredients called?",
    options: ["Washoku", "Bento", "Kaiseki", "Izakaya"],
    answer: 0,
    explanation: "Washoku is the traditional dietary cultures of the Japanese, recognized as UNESCO Intangible Cultural Heritage."
  },
  {
    id: "cul-002",
    topic: "Food Culture",
    question: "What is a traditional multi-course Japanese dinner that originated from tea ceremony meals called?",
    options: ["Kaiseki-ryori", "Teishoku", "Omakase", "Yakiniku"],
    answer: 0,
    explanation: "Kaiseki is a traditional multi-course haute cuisine characterized by meticulous preparation and artistic presentation."
  },
  {
    id: "cul-003",
    topic: "Food Culture",
    question: "What are Japanese boxed lunches that feature artfully arranged meals, often shaped like anime characters or flowers, called?",
    options: ["Onigiri", "Bento", "Donburi", "Takoyaki"],
    answer: 1,
    explanation: "Bento boxes are single-portion takeout or home-packed meals, famously creative and balanced in Japanese culture."
  },

  // --- 23. 寺 (Buddhist Temple) ---
  {
    id: "temple-001",
    topic: "Temple",
    question: "Which famous Buddhist temple in Asakusa, Tokyo, is known for its iconic giant red lantern and bustling Nakamise shopping street?",
    options: ["Kiyomizu-dera", "Senso-ji", "Kinkaku-ji", "Todai-ji"],
    answer: 1,
    explanation: "Senso-ji is Tokyo's oldest and most famous Buddhist temple, drawing millions of visitors annually."
  },
  {
    id: "temple-002",
    topic: "Temple",
    question: "Which Buddhist temple in Nara houses a colossal bronze statue of the Great Buddha (Daibutsu)?",
    options: ["Todai-ji", "Horyu-ji", "Kofuku-ji", "Yakushi-ji"],
    answer: 0,
    explanation: "Todai-ji in Nara is home to one of the world's largest bronze statues of Vairocana Buddha."
  },
  {
    id: "temple-003",
    topic: "Temple",
    question: "What is the nickname of Rokuon-ji in Kyoto, famous for its top two floors being entirely covered in gold leaf?",
    options: ["Ginkaku-ji (Silver Pavilion)", "Kinkaku-ji (Golden Pavilion)", "Ryoan-ji", "Ninna-ji"],
    answer: 1,
    explanation: "Kinkaku-ji is widely known as the Golden Pavilion, reflecting brilliantly over a mirror pond in northern Kyoto."
  },

  // --- 24. 神社 (Shinto Shrine) ---
  {
    id: "shrine-001",
    topic: "Shrine",
    question: "What is the traditional Japanese red gate that marks the transition from the secular world to sacred ground at a Shinto shrine called?",
    options: ["Torii", "Shoji", "Fusuma", "Tatami"],
    answer: 0,
    explanation: "A Torii gate is the iconic symbolic gateway standing at the entrance of every Shinto shrine."
  },
  {
    id: "shrine-002",
    topic: "Shrine",
    question: "Which famous Shinto shrine in Kyoto is renowned for its thousands of vibrant vermilion torii gates stretching up a mountain?",
    options: ["Meiji Jingu", "Fushimi Inari Taisha", "Ise Jingu", "Itsukushima Shrine"],
    answer: 1,
    explanation: "Fushimi Inari Shrine features mesmerizing mountain pathways framed by over 10,000 bright red torii gates."
  },
  {
    id: "shrine-003",
    topic: "Shrine",
    question: "Which UNESCO World Heritage Shinto shrine in Hiroshima Prefecture appears to 'float' on water during high tide?",
    options: ["Itsukushima Shrine", "Izumo Taisha", "Kashima Jingu", "Atsuta Jingu"],
    answer: 0,
    explanation: "Itsukushima Shrine on Miyajima island is famous for its iconic torii gate and shrine buildings built over tidal water."
  },

  // --- 25. 東京 (Tokyo) ---
  {
    id: "tokyo-001",
    topic: "Tokyo",
    question: "Which famous scramble intersection outside Shibuya Station is often considered one of the busiest pedestrian crossings in the world?",
    options: ["Shinjuku Crossing", "Shibuya Scramble Crossing", "Ginza Crossing", "Akihabara Crossing"],
    answer: 1,
    explanation: "Shibuya Scramble Crossing is a legendary Tokyo landmark where thousands cross the street simultaneously from all directions."
  },
  {
    id: "tokyo-002",
    topic: "Tokyo",
    question: "What is the name of Tokyo's self-supporting broadcasting tower that stands at 634 meters high?",
    options: ["Tokyo Tower", "Tokyo Skytree", "RoPants Tower", "Milky Way Spire"],
    answer: 1,
    explanation: "Tokyo Skytree is the tallest structure in Japan and one of the tallest communication towers in the world."
  },
  {
    id: "tokyo-003",
    topic: "Tokyo",
    question: "Which district in Tokyo is internationally renowned as the hub for anime, manga, video games, and electronics culture?",
    options: ["Ginza", "Akihabara", "Roppongi", "Asakusa"],
    answer: 1,
    explanation: "Akihabara (Akiba) is the world capital for otaku culture, electronics, anime merchandise, and retro gaming."
  },

  // --- 26. 大阪 (Osaka) ---
  {
    id: "osaka-001",
    topic: "Osaka",
    question: "What is the name of the famous neon-lit entertainment district in Osaka featuring the giant Glico Running Man sign?",
    options: ["Shinsekai", "Dotonbori", "Umeda", "Namba"],
    answer: 1,
    explanation: "Dotonbori is Osaka's vibrant entertainment hub, famous for neon lights, street food, and the iconic Glico sign."
  },
  {
    id: "osaka-002",
    topic: "Osaka",
    question: "Which popular Japanese savory snack, consisting of wheat flour-based batter and pieces of octopus cooked in a spherical pan, originated in Osaka?",
    options: ["Takoyaki", "Okonomiyaki", "Gyoza", "Taiyaki"],
    answer: 0,
    explanation: "Takoyaki (octopus balls) is Osaka's signature street food, crispy on the outside and gooey on the inside."
  },
  {
    id: "osaka-003",
    topic: "Osaka",
    question: "Which historic landmark castle was originally built by Toyotomi Hideyoshi in the late 16th century in Osaka?",
    options: ["Osaka Castle", "Nagoya Castle", "Okayama Castle", "Osaka Bay Fortress"],
    answer: 0,
    explanation: "Osaka Castle played a major role in the unification of Japan during the Azuchi-Momoyama period."
  },

  // --- 27. 京都 (Kyoto) ---
  {
    id: "kyoto-001",
    topic: "Kyoto",
    question: "What is the famous historic district in Kyoto known for its preserved wooden machiya houses and traditional geisha culture?",
    options: ["Arashiyama", "Gion", "Pontocho", "Higashiyama"],
    answer: 1,
    explanation: "Gion is Kyoto's most famous geisha district, renowned for traditional entertainment and historic tea houses."
  },
  {
    id: "kyoto-002",
    topic: "Kyoto",
    question: "What is the name of the stunning bamboo grove located in the western outskirts of Kyoto in Arashiyama?",
    options: ["Sagano Bamboo Forest", "Fushimi Bamboo Park", "Kiyomizu Bamboo Alley", "Kyoto Green Path"],
    answer: 0,
    explanation: "The Sagano Bamboo Grove in Arashiyama is famous for its towering green stalks that create ethereal sounds when the wind blows."
  },
  {
    id: "kyoto-003",
    topic: "Kyoto",
    question: "Which famous Buddhist temple in Kyoto is renowned for its large wooden veranda built without using a single nail?",
    options: ["Kiyomizu-dera", "Tofuku-ji", "Nanzen-ji", "Ginkaku-ji"],
    answer: 0,
    explanation: "Kiyomizu-dera features a massive wooden stage jutting out over the hillside, offering panoramic views of Kyoto."
  },

  // --- 28. 北海道 (Hokkaido) ---
  {
    id: "hokkaido-001",
    topic: "Hokkaido",
    question: "What is the capital city and largest urban center of Hokkaido?",
    options: ["Asahikawa", "Hakodate", "Sapporo", "Otaru"],
    answer: 2,
    explanation: "Sapporo is Hokkaido's vibrant capital, famous for its annual snow festival, beer, and miso ramen."
  },
  {
    id: "hokkaido-002",
    topic: "Hokkaido",
    question: "Every February, what world-famous winter event featuring massive ice sculptures is held in Sapporo?",
    options: ["Sapporo Snow Festival (Yuki Matsuri)", "Otaru Light Path", "Asahikawa Ice Carnival", "Biei Winter Lightup"],
    answer: 0,
    explanation: "The Sapporo Snow Festival attracts millions of visitors to view intricate snow and ice sculptures in Odori Park."
  },
  {
    id: "hokkaido-003",
    topic: "Hokkaido",
    question: "Which large flightless bird-like crane native to Hokkaido's wetlands is a sacred symbol of longevity and fidelity in Japan?",
    options: ["Red-crowned crane (Tancho)", "Japanese cormorant", "Steller's sea eagle", "Whooper swan"],
    answer: 0,
    explanation: "The red-crowned crane (Tancho) is an endangered majestic bird famously photographed in Hokkaido's snowy marshes."
  },

  // --- 29. 新幹線 (Shinkansen) ---
  {
    id: "shink-001",
    topic: "Shinkansen",
    question: "In what year did the world's first high-speed Shinkansen line (Tokaido Shinkansen) open, coinciding with the Tokyo Olympics?",
    options: ["1954", "1964", "1972", "1988"],
    answer: 1,
    explanation: "The Tokaido Shinkansen opened on October 1, 1964, revolutionizing global high-speed rail travel."
  },
  {
    id: "shink-002",
    topic: "Shinkansen",
    question: "What is the name of the next-generation maglev train line currently under development in Japan designed to connect Tokyo and Osaka in record time?",
    options: ["Chuo Shinkansen", "Hokuriku Shinkansen", "Tohoku Shinkansen", "Kyushu Shinkansen"],
    answer: 0,
    explanation: "The Chuo Shinkansen is a maglev high-speed rail line being built using superconducting magnetic levitation."
  },
  {
    id: "shink-003",
    topic: "Shinkansen",
    question: "What is the famous nickname of the specialized Shinkansen train used to inspect track and overhead wire conditions?",
    options: ["Doctor Yellow", "Bullet Express", "Silver Arrow", "Lightning Train"],
    answer: 0,
    explanation: "Doctor Yellow is a bright yellow Shinkansen inspection train that checks track alignment and electrical signals."
  },

  // --- 30. 寿司 (Sushi) ---
  {
    id: "sushi-001",
    topic: "Sushi",
    question: "What is the traditional Japanese style of sushi where hand-pressed vinegared rice is topped with a slice of fresh fish called?",
    options: ["Maki-zushi", "Nigiri-zushi", "Chirashi-zushi", "Inari-zushi"],
    answer: 1,
    explanation: "Nigiri-zushi consists of an oblong mound of pressed vinegared rice draped with a slice of seafood."
  },
  {
    id: "sushi-002",
    topic: "Sushi",
    question: "What is 'Wasabi', the pungent green paste served with sushi, botanically related to?",
    options: ["Horseradish and mustard family", "Mint family", "Ginger family", "Onion family"],
    answer: 0,
    explanation: "Wasabi is made from the grated rhizome of Eutrema japonicum, which belongs to the Brassicaceae (cabbage/horseradish) family."
  },
  {
    id: "sushi-003",
    topic: "Sushi",
    question: "What style of sushi features ingredients rolled inside seasoned rice and wrapped in toasted nori seaweed?",
    options: ["Nigiri", "Maki-zushi (Roll sushi)", "Sashimi", "Narezushi"],
    answer: 1,
    explanation: "Maki-zushi refers to cylindrical rolled sushi pieces wrapped in seaweed (nori)."
  },

  // --- 31. うどん (Udon) ---
  {
    id: "udon-001",
    topic: "Udon",
    question: "What are thick, chewy wheat flour noodles in Japanese cuisine called?",
    options: ["Soba", "Ramen", "Udon", "Somen"],
    answer: 2,
    explanation: "Udon noodles are thick, comforting wheat noodles popular across Japan in hot broths or cold dipping sauces."
  },
  {
    id: "udon-002",
    topic: "Udon",
    question: "Which prefecture in Japan is globally famous for its delicious udon noodles, often nicknamed the 'Udon Prefecture'?",
    options: ["Kagawa Prefecture (Sanuki)", "Fukuoka", "Kyoto", "Hokkaido"],
    answer: 0,
    explanation: "Kagawa Prefecture (historically Sanuki) is renowned for Sanuki udon, famous for its firm, chewy texture."
  },
  {
    id: "udon-003",
    topic: "Udon",
    question: "What is 'Kitsune Udon' named after, which features a topping of fried tofu?",
    options: ["Its fox-shaped noodles", "Folklore that foxes love fried tofu (Abura-age)", "Its golden color", "A famous chef named Kitsune"],
    answer: 1,
    explanation: "According to Japanese folklore, foxes (kitsune) love fried tofu, which inspired the name of this comforting udon dish."
  },

  // --- 32. そば (Soba) ---
  {
    id: "soba-001",
    topic: "Soba",
    question: "What are thin Japanese noodles made from buckwheat flour called?",
    options: ["Udon", "Soba", "Ramen", "Yakisoba"],
    answer: 1,
    explanation: "Soba noodles are made from buckwheat flour (or a blend of buckwheat and wheat) with an earthy, nutty flavor."
  },
  {
    id: "soba-002",
    topic: "Soba",
    question: "What is the traditional Japanese custom of eating long buckwheat noodles on New Year's Eve called?",
    options: ["Toshikoshi Soba", "Oshogatsu Soba", "Hatsumode Soba", "Ehomaki"],
    answer: 0,
    explanation: "Toshikoshi Soba ('year-crossing soba') is eaten on December 31st to symbolize longevity and cutting away the hardships of the past year."
  },
  {
    id: "soba-003",
    topic: "Soba",
    question: "What is the hot, nourishing cooking water left over after boiling soba noodles, which is often mixed with remaining dipping sauce to drink at the end of a meal?",
    options: ["Soba-yu", "Dashi", "Mentsuyu", "Matcha"],
    answer: 0,
    explanation: "Soba-yu is nutrient-rich buckwheat water served at the end of a soba meal to mix with leftover dipping sauce."
  },

  // --- 33. コンビニ (Convenience Store) ---
  {
    id: "conv-001",
    topic: "Convenience Store",
    question: "Which popular Japanese convenience store chain features a triangular logo with a milk jug and is known for its freshly fried 'FamiChiki' chicken?",
    options: ["Lawson", "FamilyMart", "7-Eleven", "MiniStop"],
    answer: 1,
    explanation: "FamilyMart is one of Japan's leading convenience store chains, famous for its juicy 'Famichiki' hot snack."
  },
  {
    id: "conv-002",
    topic: "Convenience Store",
    question: "What are the hot, triangle-shaped rice balls wrapped in plastic that you can unwrap yourself at Japanese convenience stores called?",
    options: ["Bento", "Onigiri (Rice ball)", "Nikuman", "Oden"],
    answer: 1,
    explanation: "Onigiri are ubiquitous convenience store snacks with fillings like tuna mayo, pickled plum (umeboshi), or salted salmon."
  },
  {
    id: "conv-003",
    topic: "Convenience Store",
    question: "What popular hot stewed snack containing daikon, fish cakes, and boiled eggs is prominently sold near the cash registers of Japanese convenience stores during winter?",
    options: ["Ramen", "Oden", "Curry", "Miso soup"],
    answer: 1,
    explanation: "Oden is a comforting Japanese winter hot-pot dish featuring various ingredients simmered in a light soy-dashi broth."
  },
// --- 1. 日本語由来の英語 (Japanese Loanwords) ---
  {
    id: "loan-001",
    topic: "Japanese Loanwords",
    question: "The word 'emoji' is widely used in English digital communication. What is its original literal meaning in Japanese?",
    options: ["Drawing character", "Animal character", "Drawing attack", "Animal glasses"],
    answer: 0,
    explanation: "'Emoji' comes from Japanese 'e' (絵: picture) + 'moji' (文字: character/letter), literally meaning a picture character or symbol used in electronic messages."
  },
  {
    id: "loan-002",
    topic: "Japanese Loanwords",
    question: "What is the literal meaning of the Japanese word 'karaoke', which has become a globally popular form of entertainment?",
    options: ["Empty orchestra", "Singing machine", "Loud microphone", "Silent music"],
    answer: 0,
    explanation: "'Karaoke' is a portmanteau of Japanese 'karappo' (empty) and 'okesutora' (orchestra), meaning an orchestra without the lead vocals/musicians present."
  },
  {
    id: "loan-003",
    topic: "Japanese Loanwords",
    question: "In English presentation culture, 'pechakucha' is a fast-paced presentation style (20 slides x 20 seconds). What does 'pecha-kucha' roughly mean in Japanese?",
    options: ["Talk a lot / Chit-chat", "Quick and clean", "Loud and clear", "Think and speak"],
    answer: 0,
    explanation: "'Pechakucha' (ペチャクチャ) is a Japanese onomatopoeia sound-symbolic word representing idle chatter, chatting, or talking much."
  },
  {
    id: "loan-004",
    topic: "Japanese Loanwords",
    question: "The word 'naruto' is used in English not only for the famous ninja anime, but what is a 'naruto' in traditional Japanese cuisine?",
    options: ["Fish cake with a spiral pattern", "Steamed rice dumpling", "Fried chicken skewer", "Sweet red bean bun"],
    answer: 0,
    explanation: "In food culture, 'naruto' or 'narutomaki' is a type of cured surimi fish cake featuring a distinct pink or red spiral pattern, often served in ramen.",
    images: ["/images/naruto.webp"]
  },
  {
    id: "loan-005",
    topic: "Japanese Loanwords",
    question: "The English word 'tycoon' (meaning a wealthy and powerful businessperson) is actually derived from a Japanese historical title. Which word is it?",
    options: ["Shogun", "Taikun", "Daimyo", "Samurai"],
    answer: 1,
    explanation: "'Tycoon' originates from the Japanese title 'taikun' (大君), meaning 'great lord' or 'supreme commander', which foreign diplomats used to address the Tokugawa Shogun."
  },
  {
    id: "loan-006",
    topic: "Japanese Loanwords",
    question: "What does the Japanese-origin word 'tsunami' literally translate to in English?",
    options: ["Killer wave", "Harbor wave", "Deep ocean storm", "Giant water wall"],
    answer: 1,
    explanation: "'Tsunami' comes from Japanese 'tsu' (港: harbor) + 'nami' (波: wave), reflecting how a wave can be relatively unnoticeable in deep water but crest high when entering a harbor."
  },
  {
    id: "loan-007",
    topic: "Japanese Loanwords",
    question: "In English, a 'honcho' (as in 'head honcho') refers to a person in charge or a boss. What is the original Japanese word?",
    options: ["Hanchou (Squad leader / Group leader)", "Honke (Main family)", "Hhontai (Main body)", "Hando (Hand/Leader)"],
    answer: 0,
    explanation: "'Honcho' comes from Japanese 'hanchō' (班長), meaning a leader of a group, squad, or team (han)."
  },

];

/**
 * 全トピックからランダムに1つのクイズを取得する関数
 * 日付やユーザーに関わらず、毎回完全にランダムな問題を選択します。
 */
export function getRandomQuiz(): QuizItem {
  const randomIndex = Math.floor(Math.random() * DAILY_QUIZZES.length);
  return DAILY_QUIZZES[randomIndex];
}

/**
 * 指定された数だけ重複なくランダムなクイズの配列を取得したい場合の便利なヘルパー関数（オプション）
 */
export function getRandomQuizzes(count: number): QuizItem[] {
  const shuffled = [...DAILY_QUIZZES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
}