# 예수님 스탬프 투어

교회 성탄 행사용 아이패드 웹 게임 모음. 빌드 과정 없이 HTML/CSS/JS 파일만으로 동작한다.

## 실행

```bash
python3 -m http.server 8000
```

- 같은 와이파이의 아이패드 Safari에서 `http://<맥 IP 주소>:8000` 접속
- 부스마다 게임 하나만 띄우려면 게임 주소로 바로 접속: `http://<맥 IP 주소>:8000/games/loaves/`

## 행사 당일 아이패드 설정

1. Safari 공유 버튼 → **홈 화면에 추가** (주소창 없는 전체 화면으로 실행됨)
2. 설정 → 손쉬운 사용 → **사용법 유도 접근** 켜기 → 게임 화면에서 측면 버튼 세 번 눌러 잠금
3. 소리가 나는지 확인 (볼륨, 무음 모드)

## 게임 목록

| 폴더 | 게임 | 상태 |
|---|---|---|
| `games/inn/` | 방 있나요? | 완성 (이모지 버전) |
| `games/stable/` | 마구간 숨은그림찾기 | 완성 (이모지 버전) |
| `games/star/` | 예수님을 만나러 가요 | 완성 (이모지 버전) |
| `games/loaves/` | 오병이어 나눠주기 | 완성 (이모지 버전) |
| `games/net/` | 베드로의 그물 | 완성 (이모지 버전) |

## 난이도 조절

각 게임 JS 파일 맨 위 `CONFIG` 값을 바꾼다. 예: `games/loaves/loaves.js`

- `durationSec`: 제한 시간 (초)
- `servingsToWin`: 통과에 필요한 정답 횟수 (기본 40, 낮출수록 쉬움)
- `stunMs`: 잘못 눌렀을 때 멈추는 시간

`games/net/net.js`

- `netRadius`: 그물 크기 (클수록 쉬움, 기본 10)
- `schoolSize`: 한 떼의 물고기 수 (기본 4~8마리)
- `reloadMs`: 다시 던질 수 있을 때까지 걸리는 시간

`games/inn/inn.js`

- `durationSec`: 제한 시간 (기본 90초)
- `pairs`: 카드 짝 수 (기본 6쌍 = 12장, 최대 7쌍)
- `previewMs`: 시작할 때 모든 카드를 보여 주는 시간

`games/stable/stable.js`

- `durationSec`: 제한 시간 (기본 90초)
- `targetSize`: 숨은 물건 크기 (클수록 쉬움)
- `missPenaltySec`: 엉뚱한 곳을 누르면 줄어드는 시간
- `hintAfterSec`: 이 시간 동안 못 찾으면 남은 물건 하나가 반짝임

`games/star/star.js`

- `journeySec`: 베들레헴까지 걸리는 시간 (기본 45초)
- `hearts`: 부딪혀도 되는 횟수
- `spawnEvery`: 장애물이 나오는 간격 (처음 → 마지막, 클수록 쉬움)
- `fallSec`: 장애물이 떨어지는 시간 (처음 → 마지막, 클수록 쉬움)

## 그림

지금은 Microsoft Fluent Emoji 3D 그림(`assets/fluent/`, MIT 라이선스)을 쓴다.
각 게임 JS 파일의 `ASSETS` 경로를 바꾸면 그림이 바뀐다. (이모지 글자를 넣어도 동작한다)

성탄 인물처럼 새로 만들어야 할 그림 목록과 AI 프롬프트는 `assets/README.md` 에 있다.

## 효과음 교체

기본 효과음은 코드로 합성한 소리다. 파일을 구하면 게임 JS 맨 아래에 경로를 넣는다.

```js
Game.sound.files.wrong = 'sounds/wrong.mp3';   // correct, wrong, tick, go, success, fail
```
