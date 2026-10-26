# 그림 에셋

## 지금 쓰는 그림: `fluent/`

[Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) 의 3D 그림(256×256 PNG)이다.
MIT 라이선스라 무료로 쓸 수 있고, 라이선스 전문은 `fluent/LICENSE` 에 있다.

게임마다 JS 파일 맨 위 `ASSETS` 에서 어떤 그림을 쓸지 정한다.

```js
const IMG = '../../assets/fluent/';
const ASSETS = {
  mary: IMG + 'woman.png',
  ...
};
```

## 새로 만들 그림: `custom/`

성탄 인물처럼 Fluent Emoji 에 알맞은 그림이 없어 **현대식 그림으로 대신하고 있는 것**들이다.
AI 로 만들어 `custom/` 폴더에 아래 파일 이름으로 넣으면, 게임에 연결한다.

### 파일 규칙

- PNG, **배경 투명**, 512×512 정도의 정사각형
- 대상 하나만, 가운데에, 그림의 85% 정도를 채우게
- 글자 넣지 않기

### 모든 그림 앞에 붙일 공통 문구

지금 그림(Fluent 3D)과 어울리도록 매번 똑같이 붙인다.

```
cute 3D clay-style icon in the style of Microsoft Fluent Emoji, soft studio lighting,
rounded shapes, warm pastel colors, single subject centered, full body visible,
transparent background, no text, no shadow on the ground
```

### 만들 그림 목록

| 우선 | 파일 이름 | 무엇 | 쓰는 곳 | 지금 대신 쓰는 그림 | 공통 문구 뒤에 붙일 내용 |
|---|---|---|---|---|---|
| ★ | `mary.png` | 마리아 | 방 있나요?, 숨은그림찾기 | woman | `young Mary of Nazareth, gentle smile, light blue head veil and simple cream robe, biblical era, bust portrait` |
| ★ | `joseph.png` | 요셉 | 방 있나요?, 숨은그림찾기 | man-beard | `Joseph the carpenter, kind face with short brown beard, brown head cloth and simple robe, biblical era, bust portrait` |
| ★ | `baby-jesus.png` | 구유에 누운 아기 예수님 | 세 게임의 마지막 장면 | baby | `newborn baby Jesus sleeping peacefully, wrapped in white swaddling cloth, lying in a small wooden manger filled with golden hay, soft warm glow` |
| ★ | `magi.png` | 동방박사 | 방 있나요? | prince | `one of the three wise men, friendly face, colorful royal robe and small golden crown, holding a gift box, biblical era` |
| ★ | `shepherd.png` | 목자 | 방 있나요? | farmer (쇠스랑을 들고 있음) | `young shepherd boy, head cloth, simple brown tunic, holding a wooden shepherd's crook, biblical era` |
| ★ | `stable.png` | 마구간 | 예수님을 만나러 가요, 방 있나요? | hut (아프리카식 오두막) | `small wooden nativity stable with a straw roof, open front, warm light inside, a bright star above the roof` |
| ☆ | `gold.png` | 황금 | 예수님을 만나러 가요 | crown | `small ornate golden treasure chest overflowing with gold coins` |
| ☆ | `frankincense.png` | 유향 | 예수님을 만나러 가요 | amphora | `ornate brass incense burner with gentle white smoke rising` |
| ☆ | `myrrh.png` | 몰약 | 예수님을 만나러 가요 | jar | `small decorated clay jar of precious oil with a cork stopper` |
| ☆ | `angel.png` | 천사 | 방 있나요? | baby-angel | `friendly angel with white robe, small feathered wings and golden halo, full body` |
| ☆ | `fishing-boat.png` | 베드로의 고깃배 | 베드로의 그물 | sailboat | `simple wooden fishing boat from the Sea of Galilee with a small square sail, side view` |

★ = 꼭 바꾸면 좋은 것, ☆ = 여유가 있으면

### 팁

- 한 대화(세션)에서 연달아 만들면 그림체가 더 잘 맞는다. 첫 그림이 마음에 들면 "같은 스타일로" 를 붙여 이어서 만든다.
- 배경이 투명하게 안 나오면 remove.bg 같은 배경 지우기 도구를 쓴다.
- 인물은 성화처럼 근엄하기보다 **다른 그림처럼 동글동글하고 귀엽게** 나오는 쪽이 잘 어울린다.
