/**
 * @file app/routes/vce.speaking.eoy-oral-accelerated.tsx
 * @description 古い URL。ページの名前を「EOY Oral Superb」に変えたので、新しい URL に移す
 *   （「accelerated」は learning pace の名前と同じで紛らわしいため、2026-11-17 に変えた）
 */
import { redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return redirect(`/vce/speaking/eoy-oral-superb${url.search}`, 301);
}
