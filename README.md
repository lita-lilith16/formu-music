# Formu Music — Review Desk

음원 유통팀과 레이블 운영팀을 위한 접수·보완·제출본 확인 지원 서비스 **Formu Music**의 독립 웹 랜딩 및 인터랙션 시연 페이지입니다.

## 1. 개요
- **목적**: 창작자의 보완본(크레딧 지분 변경, 이용 증빙 추가 등) 접수 시 바뀐 항목을 명확히 대조하고, 관련 근거 확인이 완료되기 전까지 임의 확정을 방지하는 워크스페이스 시연.
- **구현 스택**: 순수 HTML5 / CSS3 / Vanilla JavaScript (외부 의존성 없음, 즉시 정적 호스팅 가능).

## 2. 배포 및 로컬 실행
- **로컬 실행**:
  ```bash
  npx serve . -l 4188
  ```
- **정적 호스팅 (0원 배포)**:
  - **Vercel**: `npx vercel` 또는 GitHub 연결 (`https://formu-music.vercel.app`)
  - **Render**: New Static Site 연결 (`https://formu-music.onrender.com`)
  - **GitHub Pages**: Settings > Pages > `main` 브랜치 root 활성화

## 3. 유의 사항
본 페이지의 시연 데이터는 가상의 합성 시나리오(김창작/이보컬 지분 변경 및 증빙 첨부)를 기반으로 작동하며, 실제 저작권 승인 또는 DSP/DDEX 전송 대행을 의미하지 않습니다.
