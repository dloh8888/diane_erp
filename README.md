# 내 ERP — 판매 성과 리포트 (시작 버전)

이 프로젝트는 "판매 성과 리포트" 화면 하나만 있는 아주 작은 시작점입니다.
여기에 앞으로 상품/재고 관리, 프로모션 캘린더, 트렌드 대시보드 같은 화면을
하나씩 추가해나가면 개인 ERP가 됩니다.

## 이 프로젝트가 쓰는 세 가지 도구

- **GitHub**: 코드를 저장해두는 곳. Vercel이 배포할 때 여기서 코드를 가져갑니다.
- **Supabase**: 데이터베이스. 판매 데이터가 실제로 저장되는 곳입니다. (구글 스프레드시트의 상위 호환이라고 생각하면 편해요)
- **Vercel**: 이 웹앱을 인터넷에 올려서, 아무 브라우저에서나 주소로 접속할 수 있게 해주는 곳.

셋 다 무료 요금제로 시작할 수 있습니다.

---

## 1단계. GitHub에 코드 올리기

1. [github.com](https://github.com) 에서 계정이 없다면 가입합니다.
2. 오른쪽 위 `+` 버튼 → **New repository** 클릭.
3. 이름은 원하는 대로 (예: `my-erp`), Public/Private 아무거나 선택 → **Create repository**.
4. 이 프로젝트 폴더(압축 푼 폴더)에서 터미널을 열고 아래 명령어를 순서대로 실행합니다.
   (터미널이 낯설면: 폴더 안에서 마우스 우클릭 → "터미널에서 열기" 같은 메뉴를 찾아보세요.)

   ```bash
   git init
   git add .
   git commit -m "첫 커밋: 판매 성과 리포트"
   git branch -M main
   git remote add origin https://github.com/<본인계정>/<저장소이름>.git
   git push -u origin main
   ```

   `<본인계정>`, `<저장소이름>` 부분은 3번에서 만든 저장소 주소로 바꿔주세요.
   (저장소 페이지에 있는 "…or push an existing repository" 안내를 그대로 복붙해도 됩니다.)

---

## 2단계. Supabase에 데이터베이스 만들기

1. [supabase.com](https://supabase.com) 에서 **Sign in with GitHub**로 가입하면 제일 빠릅니다.
2. **New project** → 프로젝트 이름/비밀번호 설정 후 생성 (1~2분 정도 걸립니다).
3. 왼쪽 메뉴에서 **SQL Editor** 클릭 → **New query**.
4. 이 프로젝트의 `supabase/schema.sql` 파일을 열어서 내용 전체를 복사 → SQL Editor에 붙여넣기 → **Run**.
   - 이 한 번의 실행으로 `sales` 테이블 생성 + 확인용 샘플 데이터 85건 입력까지 끝납니다.
5. 왼쪽 메뉴 **Project Settings → API** 로 이동 → 아래 두 값을 복사해둡니다.
   - **Project URL**
   - **anon public** 키

---

## 3단계. Vercel에 배포하기

1. [vercel.com](https://vercel.com) 에서 **Sign in with GitHub**로 가입.
2. **Add New → Project** → 1단계에서 만든 GitHub 저장소 선택 → **Import**.
3. **Environment Variables** 항목에서 아래 두 개를 추가합니다. (2단계에서 복사해둔 값)
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public 키
4. **Deploy** 클릭 → 1~2분 기다리면 완료.
5. 배포가 끝나면 나오는 주소(`https://xxx.vercel.app`)로 접속하면 판매 성과 리포트 화면이 보입니다.

여기까지 하면 어디서든(휴대폰 포함) 그 주소로 접속해서 대시보드를 볼 수 있습니다.

---

## (선택) 내 컴퓨터에서 먼저 확인해보고 싶다면

Node.js가 설치되어 있어야 합니다 ([nodejs.org](https://nodejs.org) 에서 LTS 버전 설치).

```bash
cp .env.local.example .env.local
# .env.local 파일을 열어서 Supabase URL / anon key 값을 채워넣기
npm install
npm run dev
```

터미널에 나오는 `http://localhost:3000` 주소로 접속하면 됩니다.

---

## 실제 데이터로 바꾸기

지금은 확인용 샘플 데이터(가짜 매출 85건)가 들어가 있습니다. 실제 데이터를 넣는 가장 쉬운 방법:

1. Supabase 대시보드 → **Table Editor** → `sales` 테이블 선택.
2. **Insert row** 버튼으로 직접 한 줄씩 추가 — 코드 한 줄 안 써도 됩니다.
3. 화면을 새로고침하면 대시보드에 바로 반영됩니다.

나중에 지마켓/라자다 API에서 자동으로 데이터를 채워넣도록 자동화하는 것도 가능한데,
그건 이 화면이 손에 익은 다음에 다음 단계로 진행하면 됩니다.

---

## 폴더 구조 살짝 설명

```
app/page.js          ← 화면(대시보드) 자체. 여기서 컴포넌트들을 조립함
app/layout.js         ← 모든 페이지를 감싸는 기본 틀
lib/supabaseClient.js ← Supabase 접속 설정
lib/sales.js          ← 매출 데이터를 불러오고 계산(합계/평균 등)하는 로직
components/           ← 화면에 쓰이는 작은 조각들 (카드, 표, 그래프)
supabase/schema.sql   ← 데이터베이스 테이블 생성 + 샘플 데이터
```

다음 기능(상품 관리, 프로모션 캘린더 등)을 추가할 때도 이 구조를 그대로 따라가면 됩니다:
`supabase/`에 테이블 추가 → `lib/`에 데이터 불러오는 함수 추가 → `app/`에 새 페이지 추가.

---

## 막히면

에러 화면이 나오면 그 문구를 그대로 복사해서 저한테 보여주세요 — 대부분
`.env.local`(또는 Vercel 환경변수) 값이 안 맞거나, `schema.sql`을 아직 안 돌린 경우입니다.
