import { z } from "zod";

// 例としてのNGワードリスト（実際は環境や要件に合わせて定数ファイルに分離）
const NG_WORDS = [
  "admin", 
  "root",
  "pussy",
  "penis", 
  "moderator", 
  // その他の不適切な言葉やスラングをここに記述
];

export const nicknameSchema = z
  .string()
  .min(2, "ニックネームは2文字以上で入力してください。")
  .max(20, "ニックネームは20文字以内で入力してください。")
  .regex(/^[^\s]+(\s+[^\s]+)*$/, "前後に不要なスペースを含めないでください。")
  .refine(
    (val) => {
      const lowerVal = val.toLowerCase();
      // NGワードが含まれていないかチェック
      return !NG_WORDS.some((word) => lowerVal.includes(word));
    },
    {
      message: "このニックネームは使用できません。",
    }
  );