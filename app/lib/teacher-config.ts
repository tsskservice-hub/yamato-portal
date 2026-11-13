/**
 * @file teacher-config.ts
 * @description 教師アカウント・クラス・宿題で使う共通の設定（ブラウザとサーバーの両方から読む）
 */

// オーストラリアの州・準州（profiles.state の CHECK 制約と同じ値）。海外の人は OUTSIDE_AU
export const OUTSIDE_AU = 'OUTSIDE_AU';

export const AU_STATES = [
  { value: 'ACT', label: 'Australian Capital Territory (ACT)' },
  { value: 'NSW', label: 'New South Wales (NSW)' },
  { value: 'NT', label: 'Northern Territory (NT)' },
  { value: 'QLD', label: 'Queensland (QLD)' },
  { value: 'SA', label: 'South Australia (SA)' },
  { value: 'TAS', label: 'Tasmania (TAS)' },
  { value: 'VIC', label: 'Victoria (VIC)' },
  { value: 'WA', label: 'Western Australia (WA)' },
] as const;

export type AuState = (typeof AU_STATES)[number]['value'];
export type StateValue = AuState | typeof OUTSIDE_AU;

export const SCHOOL_NAME_MAX = 100;

// 学校名を何に使うか（未成年の利用者も多いため、入力欄に必ず添える）
export const SCHOOL_PURPOSE_TEXT =
  'Optional. We use your state and school only to improve AI Yamato features for schools, such as teacher dashboards. See our Privacy Policy.';

export function isAuState(value: unknown): value is AuState {
  return typeof value === 'string' && AU_STATES.some((s) => s.value === value);
}

export function isStateValue(value: unknown): value is StateValue {
  return value === OUTSIDE_AU || isAuState(value);
}

/**
 * 州・学校名・学校 ID の入力を DB に保存できる形に整える（空欄は null）
 * 学校名は州（または Outside Australia）を選んだときだけ保存する。学校 ID はオーストラリアの州のときだけ
 */
export function normaliseSchoolInfo(stateRaw: unknown, schoolRaw: unknown, schoolRefIdRaw?: unknown) {
  const state = isStateValue(stateRaw) ? stateRaw : null;
  const school = state && typeof schoolRaw === 'string' ? schoolRaw.trim().replace(/\s+/g, ' ') : '';
  if (school.length > SCHOOL_NAME_MAX) {
    return { error: `School name must be ${SCHOOL_NAME_MAX} characters or less.` } as const;
  }
  const refId = Number(schoolRefIdRaw);
  const schoolRefId = isAuState(state) && school && Number.isInteger(refId) && refId > 0 ? refId : null;
  return { state, schoolName: school === '' ? null : school, schoolRefId } as const;
}

// 無料の教師アカウントの上限（機能はすべて使えるが 1 クラスまで。複数クラスは学校契約）
export const TEACHER_LIMITS = {
  maxClasses: 1,
  maxStudentsPerClass: 40,
  maxActiveHomeworkPerClass: 20,
} as const;

// 宿題として出せるレッスンのタスク（edu_student_progress.task_key と同じ値）
export const LESSON_TASKS = [
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'listening', label: 'Listening' },
  { key: 'reading', label: 'Reading' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'writing', label: 'Writing' },
  { key: 'culture', label: 'Culture' },
] as const;

export type LessonTaskKey = (typeof LESSON_TASKS)[number]['key'];

export function isLessonTaskKey(value: unknown): value is LessonTaskKey {
  return typeof value === 'string' && LESSON_TASKS.some((t) => t.key === value);
}

// 手書き画像の保存期間（edu_class_writing_settings.image_retention_mode / image_retention_days）
export const HANDWRITING_RETENTION_OPTIONS = [
  { value: 'none', label: "Don't keep images (transcriptions only)" },
  { value: '30', label: 'Keep for 30 days' },
  { value: '90', label: 'Keep for 90 days' },
  { value: '180', label: 'Keep for 180 days' },
] as const;

export const DEFAULT_HANDWRITING_RETENTION_DAYS = 30;

// ---------- 生徒 1 人ずつの使い捨て招待コード（学校が Google を使っていない生徒のため） ----------

export const INVITE_CODE_DAYS = 14;
export const INVITE_CODE_LENGTH = 8;
export const INVITE_LABEL_MAX = 60;

/** 表示用に 4 文字ずつ区切る（例: K7Q2-MXRT） */
export function formatInviteCode(code: string) {
  return code.length === INVITE_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

// 学校が Google を使っていない先生に、学校のメールで Google アカウントを作ってもらうための案内
export const GOOGLE_SIGNUP_URL = 'https://accounts.google.com/signup';

// Google の同意画面に「〜 will be allowed to access…」と表示されるログイン用サーバー（Supabase）のドメイン。
// Supabase のカスタムドメインに切り替えたら、ここも書き換える
export const SIGN_IN_SERVER_HOST = 'ybquwzoreecxxbewjpdn.supabase.co';

// ---------- 学校アカウント（Google / Microsoft）での確認 ----------

// 学校アカウントの確認に使えるサインイン方法（Supabase の provider 名）。
// VITE_SCHOOL_SSO_PROVIDERS="google,azure" のように、Supabase で設定済みのものだけを並べる
export const SCHOOL_SSO_PROVIDERS = [
  { id: 'google', label: 'Google (school account)' },
  { id: 'azure', label: 'Microsoft (school account)' },
] as const;
export type SchoolSsoProvider = (typeof SCHOOL_SSO_PROVIDERS)[number]['id'];

// 個人向けの無料メール。学校アカウントとは認めない
export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.com.au', 'hotmail.com', 'hotmail.com.au', 'live.com',
  'live.com.au', 'msn.com', 'yahoo.com', 'yahoo.com.au', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'proton.me', 'protonmail.com', 'bigpond.com', 'bigpond.net.au', 'optusnet.com.au', 'gmx.com', 'zoho.com',
];

/**
 * 先生と生徒でドメインが違う学校システム（州の公立校など）。
 * teacher: 先生のメールのドメイン / students: その先生のクラスに入れる生徒のメールのドメイン
 * ※ ここにない州は「先生と同じドメイン（またはそのサブドメイン）」の生徒だけが入れる。
 *   実際のドメインを現場で確認してから追加すること
 */
export const SCHOOL_DOMAIN_GROUPS: Array<{ label: string; teacher: string; students: string[] }> = [
  { label: 'Victorian government schools', teacher: 'education.vic.gov.au', students: ['schools.vic.edu.au'] },
];

export function emailDomain(email: string | null | undefined) {
  const at = (email ?? '').lastIndexOf('@');
  return at > 0 ? email!.slice(at + 1).trim().toLowerCase() : '';
}

export function isFreeEmailDomain(domain: string) {
  return FREE_EMAIL_DOMAINS.includes(domain.toLowerCase());
}

const sameOrSubdomain = (domain: string, base: string) => domain === base || domain.endsWith(`.${base}`);

/** クラス（先生の学校ドメイン）に、このドメインの学校アカウントの生徒が参加を申請できるか */
export function isStudentDomainAllowed(classDomain: string, studentDomain: string) {
  const c = classDomain.toLowerCase();
  const s = studentDomain.toLowerCase();
  if (!c || !s || isFreeEmailDomain(s)) return false;
  if (sameOrSubdomain(s, c)) return true;
  const group = SCHOOL_DOMAIN_GROUPS.find((g) => g.teacher === c);
  return Boolean(group?.students.some((d) => sameOrSubdomain(s, d)));
}

/** 生徒に見せる「このクラスに入れる学校メール」の説明（例: @schools.vic.edu.au or @education.vic.gov.au） */
export function allowedStudentDomains(classDomain: string) {
  const group = SCHOOL_DOMAIN_GROUPS.find((g) => g.teacher === classDomain);
  return [...(group?.students ?? []), classDomain];
}
