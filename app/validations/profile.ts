import { z } from "zod";
// Import inappropriate words list from JSON file in the app/data directory
import unsuitableWordsData from "../data/unsuitable-words.json";

// Retrieve the list of unsuitable words from the JSON data
const UNSUITABLE_NICKNAMES: string[] = unsuitableWordsData.words;

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