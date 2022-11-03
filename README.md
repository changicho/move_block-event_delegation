# 이벤트 위임을 이용해 블록 옮기기 구현하기

![main](https://user-images.githubusercontent.com/38618187/87856854-d53de900-c95c-11ea-9a0e-836aa9aae633.gif)

> [배포링크](https://changicho.github.io/move_block-event_delegation/)로 들어가시면 데모를 확인할 수 있습니다.

블록의 이동을 구현할 때, 각 블록마다 이벤트를 등록하진 않으셨나요??

각각 이벤트를 등록하고 잘 동작하게 구현하셨다면 다음 글을 읽어보시는것은 어떨까요??

[왜 이벤트 위임(delegation)을 해야 하는가?](https://ui.toast.com/weekly-pick/ko_20160826/)

> 성능 측정 결과는 매우 실망스러웠다.
> 각주의 추가 삭제를 반복할수록 메모리 누수로 인해 메모리 사용량이 누적되는 것을 발견했다.
> 무슨 이유로 메모리 사용량이 누적되는 것일까?

각 블록들이 추가와 삭제가 빈번하게 일어난다면, 이벤트를 **등록**하고 **삭제**해줘야 합니다.

만약 등록된 이벤트를 삭제하지 않는다면 **메모리 누수**가 발생할 수 있어요.

그렇다면 어떻게 하나의 이벤트에서 하위 이벤트들을 관리할 수 있을까요??

저는 이벤트 위임을 이용해 이를 구현했습니다.

그렇다면 이벤트 위임이란 무엇일까요??

## 이벤트 위임

[javascript.info event-delegation](https://ko.javascript.info/event-delegation)

> 이벤트 위임을 사용하면 요소마다 핸들러를 할당하지 않고, 요소의 공통 조상에 이벤트 핸들러를 단 하나만 할당해도 여러 요소를 한꺼번에 다룰 수 있습니다.

쉽게 말하면 각각 개별 이벤트를 등록해야할 자식들 대신, 부모에 이벤트를 등록하고 분기처리 하는 것입니다.

다음과 같은 구조의 html이 존재한다고 가정해봅시다.

```html
<div class="parent">
  <div class="child1"></div>
  <div class="child2"></div>
  <div class="child3"></div>
</div>
```

그리고 각각 다음과 같은 이벤트를 등록한다고 해봅시다.

```javascript
// child1, 2, 3는 querySelect 등으로 찾아왔다고 가정합시다.

child1.addEventListener("click", () => {
  console.log("child1");
});
child2.addEventListener("click", () => {
  console.log("child2");
});
child3.addEventListener("click", () => {
  console.log("child3");
});
```

위와 같은 코드는 잘 동작합니다. 하지만 child가 매우 많아진다면 어떻할까요??

```html
<div class="parent">
  <div class="child1"></div>
  <!-- ~ -->
  <div class="child1000000"></div>
</div>
```

이 경우에는 querySelectorAll로 찾아서 하나하나 등록하는 방법도 있겠지만, 매우 번거롭습니다.

이 경우에 다음과 같은 것은 어떨까요?

```javascript
parent.addEventListener('click',(event)=>{
  const class = event.target.className;

  switch(class){
    case 'child1':{
      console.log('chlid1');
    }
    // ...
  }
})
```

하나의 이벤트로 여러개의 이벤트를 대신할 수 있습니다.

## 블록 이동 만들어보기

### 사용할 예제 소스

그렇다면 이제 블록 이동을 만들어 볼까요??

우선 다음과 같은 구조의 html을 만들어주세요

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>블록 옮기기 테스트</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <ul class="first">
      <li class="start"></li>
      <li>
        <p>하나</p>
      </li>
      <li>
        <p>둘</p>
      </li>
    </ul>
    <ul class="second">
      <li class="start"></li>
      <li>
        <p>셋</p>
      </li>
    </ul>
    <ul class="third">
      <li class="start"></li>
      <li>
        <p>넷</p>
      </li>
    </ul>
    <div class="hover"></div>
  </body>
  <script src="./main.js"></script>
</html>
```

```css
body {
  display: flex;
  flex-direction: row;
}

ul {
  width: 300px;
  height: 600px;

  margin: 10px;
  padding: 10px;

  background-color: #dddddd;
  border-radius: 10px;
}

li {
  list-style: none;
  padding: 10px;
  margin: 10px 0 10px 0;

  width: 280px;

  background-color: #888888;
  border-radius: 10px;

  text-align: center;
  color: #ffffff;
  user-select: none;
}

li.start {
  height: 0;
  border-radius: 0;
  padding: 0;
  margin: 0;
}

.hover {
  position: absolute;
  padding: 0;
  margin: 0;

  transform: rotate(-5deg);
}

.temp {
  opacity: 0.5;
}
```

각 ul은 블록을 쌓을 column을, li는 블록을 의미합니다.

이 때 편의상 ul의 맨 처음에는 시작점을 넣음에 유의해주세요.

### 클릭 구현하기

다음과 같은 기본 javascript 코드를 생성합니다.

```javascript
const body = document.querySelector("body");
const hover = document.querySelector(".hover");
```

```javascript
let clicked = false;
let hoverLi = undefined;

function mousedown(event) {
  // 마우스 왼쪽클릭 & 터치가 아닌 경우 예외처리합니다.
  if (event.button !== 0) {
    return;
  }
  // 클릭했으므로 clicked를 설정합니다.
  clicked = true;
  // 현재 클릭한 element에서 가장 가까운 li 태그를 찾습니다.
  targetRemove = event.target.closest("li");
  if (targetRemove === null || targetRemove.className === "start") {
    // 만약에 li태그를 찾지 못했거나, 시작점을 클릭했다면 return합니다.
    return;
  }

  // 현재 삭제하려고 하는 target은 li태그입니다.
  targetLi = targetRemove;
  // 내부 값을 복사한 element를 마우스를 따라다닐 hover로 설정합니다.
  hoverLi = targetRemove.cloneNode(true);
  // target을 불투명하게 하기 위해 class를 넣어주세요
  targetLi.classList.add("temp");

  const { pageX, pageY } = event;

  // hover에 아까 clone한 element를 붙여넣어줍니다.
  hover.appendChild(hoverLi);

  // 마우스 중앙에 hover가 오도록 설정합니다.
  hover.style.left = pageX - hover.offsetWidth / 2 + "px";
  hover.style.top = pageY - hover.offsetHeight / 2 + "px";
}

function mouseup() {
  // 클릭되지 않은 상태면 실행하지 않습니다.
  if (!clicked) {
    return;
  }

  clicked = false; // 클릭이 종료되었으므로 했으므로 clicked를 설정합니다.
  if (targetLi) {
    // targetLi가 있으면 class를 제거해주세요
    targetLi.classList.remove("temp");
  }
  if (hoverLi) {
    // hoverLi는 hover가 끝나므로 더이상 필요하지 않습니다.
    hoverLi.remove();
  }
  // 아래 전역변수들을 초기화해주세요
  hoverLi = undefined;
  targetLi = undefined;
}

body.addEventListener("mousedown", mousedown);
body.addEventListener("mouseup", mouseup);
```

위 코드를 적용하면 다음과 같은 결과를 얻을 수 있습니다.

![click](https://user-images.githubusercontent.com/38618187/87857235-24394d80-c960-11ea-827b-810be3d85845.gif)

### 이동 구현하기

이제 제일 중요한 이동을 구현해볼 건데요,

이동이 다음 순서로 일어남에 유의해주세요

1. 마우스 클릭
   1. li태그를 찾음
   2. hover에 표시
2. 마우스 움직이기 (클릭한 상태로)
   1. hover의 좌표를 마우스 좌표에 맞춰서 변경
   2. 현재 마우스 좌표가 어떤 li 위에 있는지에 따라서 분기처리
      - 현재 li 앞에 이동? 뒤에 이동?
3. 마우스에서 손 떼기
   1. hover 초기화하기
   2. 전역으로 선언한 부분 초기화하기

그런데 hover가 마우스를 따라다니는 경우에, 마우스 좌표에 존재하는 li를 어떻게 찾을 수 있을까요?

hover가 마우스 좌표를 항상 따라다녀서 hover만을 찾아올 텐데요.

이를 위해서 hover를 잠시 가려두는 방법을 사용합니다.

```javascript
// 잠시 현재 hover element를 가리고 현재 좌표의 element를 가져온다
hover.hidden = true;
// do something
hover.hidden = false;
```

이렇게 가져오는 element에서 주요하게 고려해야 할 종류는 2가지가 있습니다.

- li
- ul

이 때 ul의 경우에는 간단히 맨 위에 붙일 경우와, 맨 아래에 붙일 경우만 나누겠습니다.

ul인 경우에 시작 li 보다 좌표가 위에 있다면, 첫번째에 추가하면 되고, 그 외의 경우는 맨 아래에 추가하면 될 것입니다.

li의 경우는 좀 복잡한데요, 우선 다음 함수를 작성해주세요.

```javascript
// element2이 element1보다 앞에 있는지 검사하는 함수입니다.
function isBefore(element1, element2) {
  if (element2.parentNode === element1.parentNode) {
    for (let cur = element1.previousSibling; cur; cur = cur.previousSibling) {
      if (cur === element2) {
        return true;
      }
    }
  }

  return false;
}
```

위 함수를 이용해서 저희가 추가하려는 element를 뒤에 붙일지 앞에 붙일 지 정할 수 있습니다.

따라서 mousemove에 할당할 callback은 다음과 같이 구성됩니다.

```javascript
function mousemove(event) {
  if (!clicked || !hoverLi) return;

  // pageX, pageY 는 모든 페이지 기반
  // clientX, clientY 는 현제 보이는 화면 기반
  const { pageX, pageY } = event;

  // 잠시 현재 hover element를 가리고 현재 좌표의 element를 가져온다
  hover.hidden = true;
  const elemBelow = document.elementFromPoint(pageX, pageY);
  const li = elemBelow.closest("li");
  const ul = elemBelow.closest("ul");
  hover.hidden = false;

  // 이동할 때마다 hover의 위치를 수정해줍니다.
  hover.style.left = pageX - hover.offsetWidth / 2 + "px";
  hover.style.top = pageY - hover.offsetHeight / 2 + "px";

  // 현재 마우스가 ul을 가리키는 경우에는 li를 찾을 수 없습니다.
  if (!li) {
    // 만약 ul을 가리키고 있는 경우가 맞다면??
    if (ul) {
      const start = ul.querySelector(".start");
      const { top } = start.getBoundingClientRect();

      // 시작점보다 위에있는 경우에 맨 앞에 붙이고
      if (top > pageY) {
        start.parentNode.insertBefore(targetLi, start.nextSibling);
      } else {
        // 그 외에는 맨 아래에 붙이면 되겠네요.
        ul.appendChild(targetLi);
      }
    }
    return;
  }

  // 만약 같은 ul에서 li가 현재 좌표에 있는 target보다 앞에있으면
  // target을 li 앞으로 옮겨줍니다.
  if (isBefore(targetLi, li) && li.className !== "start") {
    li.parentNode.insertBefore(targetLi, li);
  } else if (li.parentNode) {
    // 그 외에는 뒤로 이동시켜 버리면 됩니다.
    li.parentNode.insertBefore(targetLi, li.nextSibling);
  }
}

// 마지막으로 이벤트를 등록해주세요
body.addEventListener("mousemove", mousemove);
```

[MDN insertBefore](https://developer.mozilla.org/ko/docs/Web/API/Node/insertBefore)

이 때 insertBefore를 이용해서 이전에 위치했던 targetLi를 이동시켜 버리는 것에 유의해주세요.

> 만약 주어진 자식 노드가 document에 존재하는 노드를 참조한다면, insertBefore() 가 자식 노드를 현재 위치에서 새로운 위치로 옮깁니다. (노드를 다른 노드에 추가하기 전에 상위 노드에서 제거할 필요가 없습니다)

### 마우스가 화면을 벗어날 때

만약 마우스가 화면을 벗어나는 경우에는 어떻게 할까요?

가장 간단한 방법으로는, 마우스 클릭이 끝났을 때의 동작을 시키는 것입니다.

다음과 같은 방법을 사용합시다.

```javascript
function mouseleave() {
  // 화면을 벗어났을 때 click한 상태가 아니라면 return합니다.
  if (!clicked) {
    return;
  }
  // mouseup 함수를
  mouseup();
}

body.addEventListener("mouseleave", mouseleave);
```

---

자 이렇게 블록이동의 구현을 완료했습니다.

어떤가요? 마우스 이벤트 만으로 그럴듯한 블록이동의 구현이 완료되었습니다.

drag & drop api를 사용할 경우 몇몇 코드를 삭제할 수도 있습니다.

한번 위 코드를 drag & drop api 에 맞춰서 수정해보세요.
