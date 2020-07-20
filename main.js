const body = document.querySelector("body");
const hover = document.querySelector(".hover");

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

let clicked = false;
let hoverLi = undefined;
let targetLi = undefined;

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

  hover.style.left = pageX - hover.offsetWidth / 2 + "px";
  hover.style.top = pageY - hover.offsetHeight / 2 + "px";

  if (!li) {
    if (ul) {
      const start = ul.querySelector(".start");
      const { top } = start.getBoundingClientRect();
      if (top > pageY) {
        start.parentNode.insertBefore(targetLi, start.nextSibling);
      } else {
        ul.appendChild(targetLi);
      }
    }

    return;
  }

  if (isBefore(targetLi, li) && li.className !== "start") {
    li.parentNode.insertBefore(targetLi, li);
  } else if (li.parentNode) {
    li.parentNode.insertBefore(targetLi, li.nextSibling);
  }
}

function mousedown(event) {
  if (event.button !== 0) {
    return;
  }

  clicked = true;
  targetRemove = event.target.closest("li");
  if (targetRemove === null || targetRemove.className === "start") {
    return;
  }

  targetLi = targetRemove;
  hoverLi = targetRemove.cloneNode(true);
  targetLi.classList.add("temp");

  const { pageX, pageY } = event;

  hover.appendChild(hoverLi);

  hover.style.left = pageX - hover.offsetWidth / 2 + "px";
  hover.style.top = pageY - hover.offsetHeight / 2 + "px";
}

function mouseup() {
  if (!clicked) {
    return;
  }

  clicked = false;
  if (targetLi) {
    targetLi.classList.remove("temp");
  }
  if (hoverLi) {
    hoverLi.remove();
  }
  hoverLi = undefined;
  targetLi = undefined;
}

function mouseleave() {
  if (!clicked) {
    return;
  }
  mouseup();
}

body.addEventListener("mousemove", mousemove);
body.addEventListener("mousedown", mousedown);
body.addEventListener("mouseup", mouseup);
body.addEventListener("mouseleave", mouseleave);
