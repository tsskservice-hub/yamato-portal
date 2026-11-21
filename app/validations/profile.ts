import { z } from "zod";
// Import inappropriate words list from JSON file in the app/data directory
// 💡 api（yamato-api）の src/data/unsuitable-words.json に同じ一覧のコピーがある（クラスのライブゲームの名前チェック用）。
//    一覧を直すときは両方を同じ内容にして、api もデプロイし直す
import unsuitableWordsData from "../data/unsuitable-words.json";

// Retrieve and flatten the list of unsuitable words from the categorized JSON data
const UNSUITABLE_NICKNAMES: string[] = [
  ...unsuitableWordsData.admin_system,
  ...unsuitableWordsData.money_scam,
  ...unsuitableWordsData.politics,
  ...unsuitableWordsData.race_discrimination,
  ...unsuitableWordsData.violence,
  ...unsuitableWordsData.sexual,
  ...unsuitableWordsData.japanese_slang,
];

export const nicknameSchema = z
  .string()
  .min(2, "Nickname must be at least 2 characters long.")
  .max(20, "Nickname must be 20 characters or less.")
  .regex(/^[^\s]+(\s+[^\s]+)*$/, "Do not include unnecessary spaces at the beginning or end.")
  .refine(
    (val) => {
      const lowerVal = val.toLowerCase();
      // Check if the input contains any unsuitable words
      return !UNSUITABLE_NICKNAMES.some((word) => lowerVal.includes(word));
    },
    {
      message: "This nickname cannot be used.",
    }
  );