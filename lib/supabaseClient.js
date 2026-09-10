// Supabase에 접속하기 위한 클라이언트를 딱 한 번만 만들어서
// 앱 전체에서 재사용합니다.
//
// 여기서 바로 throw 하지 않는 이유: 서버 컴포넌트 최상단에서 import할 때
// 에러가 터지면 Next.js가 처리 안 된 크래시로 보여줘서 초보자가 원인을
// 알기 어렵습니다. 대신 supabaseConfigError에 에러 메시지를 담아두고,
// 화면(app/page.js)에서 이 값을 확인해서 친절한 안내 화면을 보여줍니다.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export let supabase = null;
export let supabaseConfigError = null;

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseConfigError =
    '.env.local 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되어 있지 않습니다. ' +
    '.env.local.example 파일을 참고해서 .env.local 파일을 만들어주세요. (Vercel에 배포한 경우엔 ' +
    'Project Settings > Environment Variables 에도 똑같이 등록해야 합니다.)';
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}
