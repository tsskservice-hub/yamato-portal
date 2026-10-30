import React from "react";
import { Lightbulb, X } from "lucide-react";

export interface ElaborateHintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ElaborateHintModal: React.FC<ElaborateHintModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="閉じる"
        >
          <X size={20} />
        </button>

        {/* モーダルヘッダー */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
            <Lightbulb size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              深掘り（Elaborate）の切り口ヒント
            </h3>
            <p className="text-xs text-slate-500">
              1文目をもとに、どうやって文章を広げるか迷ったときのガイドです
            </p>
          </div>
        </div>

        {/* 切り口パターン一覧 */}
        <div className="space-y-4 my-6">
          {/* パターン 1 */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <h4 className="font-bold text-sm text-indigo-900 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded text-xs font-semibold">
                パターン 1
              </span>
              理由 ＋ エピソード（体験談）
            </h4>
            <div className="text-xs text-slate-700 mt-2 space-y-1">
              <p>
                ・<strong>2文目:</strong> なぜそう思うかの理由を書く
              </p>
              <p className="text-slate-500 pl-3">
                例：「なぜなら、毎日練習して少しずつ上手になるのが楽しいからです。」
              </p>
              <p>
                ・<strong>3文目:</strong> 実際に体験した出来事を書く
              </p>
              <p className="text-slate-500 pl-3">
                例：「去年の大会では、最後に逆転勝ちできてとても嬉しかったです。」
              </p>
            </div>
          </div>

          {/* パターン 2 */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded text-xs font-semibold">
                パターン 2
              </span>
              5W1H（状況の補足）＋ 感じたこと
            </h4>
            <div className="text-xs text-slate-700 mt-2 space-y-1">
              <p>
                ・<strong>2文目:</strong> いつ・どこで・誰となどの状況を書く
              </p>
              <p className="text-slate-500 pl-3">
                例：「毎週日曜日に、近所の公園で友達と一緒に練習しています。」
              </p>
              <p>
                ・<strong>3文目:</strong> そのときの気持ちや変化を書く
              </p>
              <p className="text-slate-500 pl-3">
                例：「練習の後は疲れますが、大きな達成感があって充実しています。」
              </p>
            </div>
          </div>

          {/* パターン 3 */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
            <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-xs font-semibold">
                パターン 3
              </span>
              過去との比較 ＋ 今後の目標
            </h4>
            <div className="text-xs text-slate-700 mt-2 space-y-1">
              <p>
                ・<strong>2文目:</strong> 昔はどうだったかを振り返る
              </p>
              <p className="text-slate-500 pl-3">
                例：「始めたばかりの時はうまくできず、何度も諦めそうになりました。」
              </p>
              <p>
                ・<strong>3文目:</strong> 今の自分や今後の意気込みを書く
              </p>
              <p className="text-slate-500 pl-3">
                例：「今では続けて良かったと思っており、もっと上達したいです。」
              </p>
            </div>
          </div>

          {/* パターン 4 */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
            <h4 className="font-bold text-sm text-purple-900 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded text-xs font-semibold">
                パターン 4
              </span>
              一番の理由 ＋ 別の視点・例外
            </h4>
            <div className="text-xs text-slate-700 mt-2 space-y-1">
              <p>
                ・<strong>2文目:</strong> 一番伝えたい核心的な理由を書く
              </p>
              <p className="text-slate-500 pl-3">
                例：「自分の思いを自分の言葉で伝えることが大切だと思うからです。」
              </p>
              <p>
                ・<strong>3文目:</strong> 「でも〜なときもある」と視点を広げる
              </p>
              <p className="text-slate-500 pl-3">
                例：「時には意見がすれ違うこともありますが、話し合うことで理解が深まります。」
              </p>
            </div>
          </div>
        </div>

        {/* 作成ルールのおさらい */}
        <div className="bg-slate-100 p-4 rounded-2xl text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800 mb-1">📌 作成ルールのポイント</p>
          <p>
            ・1文につき <strong className="text-slate-800">10文字以上</strong>{" "}
            の日本語で入力してください。
          </p>
          <p>
            ・英語（アルファベット）や「はい」「いいえ」などの一言応答はカウントされません。
          </p>
        </div>

        {/* 閉じるボタン */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-md"
          >
            理解しました
          </button>
        </div>
      </div>
    </div>
  );
};

export default ElaborateHintModal;