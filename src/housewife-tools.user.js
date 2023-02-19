// ==UserScript==
// @name         HouseWife Tools
// @namespace    https://www.0chan.pl/userjs/
// @version      0.0.0
// @description  UX extension for 314n.org
// @updateURL    https://github.com/juribiyan/0chan-utilities/raw/master/src/housewife-tools.meta.js
// @author       Snivy
// @include      https://314n.org/*
// @grant        GM_getResourceText
// @icon         https://raw.githubusercontent.com/juribiyan/housewife-tools/master/icon.png
// @resource     baseCSS https://raw.githubusercontent.com/Juribiyan/housewife-tools/master/css/hwt.css
// ==/UserScript==


/*-------------------------------- Routing ---------------------------------*/
const MO = new MutationObserver(observe)
function observe(mutationList, observer) {
  for (const mutation of mutationList) {
    // console.log(mutationList)
    if (mutation.type == 'childList' &&
      mutation.target.id == 'content' &&
      [].find.call(mutation.addedNodes, i => i?.classList?.contains('content'))
    ) {
      determineState()
    }
  }
}
MO.observe(document.querySelector('#content'), {subtree: true, childList: true})



function determineState() {
  let content = document.querySelector('.content')
  if (!content) {
    handleIndex()
    return
  }
  let [m, boardID, boardName, threadID] = parseHeadLine(getHeadLine(content))
  if (m) {
    if (boardName && threadID) {
      handleTopic(content)
    }
    else {
      handleBoardPage(content)
    }
  }
  else {
    handleBoardList()
  }
}

function handleRoute(type) {
  console.log('route=', type)
}

function getHeadLine(content=document.querySelector('.content')) {
  let index = 0, ret = []
  for (let node of content.childNodes) {
    if (node.nodeName == 'BR') {
      if (index==0) continue;
      else break;
    }
    ret.push(node)
    index++
  }
  return ret
}

function parseHeadLine(headLine=getHeadLine(content)) {
  let headLinePattern = /\[([0-9]+)\](?:\s*(.+?)[\s]{2,}\[([0-9]+)\])?/m
  return headLine?.[0].textContent.match(headLinePattern) || [0,0,0,0]
}

determineState() // initial routing


/*-------------------------- App state handlers ----------------------------*/
function handleIndex() {
  let c = document.querySelector('#content')
  , lastBr = c.querySelector('br:last-of-type')
  lastBr.insertAdjacentHTML('afterend', `
    <div class="hwt-menu">
      <span class="hwt-cmdlink hwt-btn" data-command="BOARDS">boards</span>
    </div>
  `)
}
 
function handleBoardList() {
  document.querySelectorAll('.pendant').forEach(p => {
    let b = p.previousSibling
    if (b.nodeName!='#text') return;
    let n = b.textContent.match(/^\[([0-9]+)\]/)?.[1]
    if (n) {
      makeClickable(b, `BOARD -n ${n}`)
    }
  })
}

function handleBoardPage(content) {
  pagination(content)
  getHeadLine(content)[0].previousElementSibling.insertAdjacentHTML('afterend', `
    <span class="hwt-cmdlink hwt-btn" data-command="BOARDS">^</span>`)
  content.querySelectorAll('.postsnumber').forEach(p => {
    let n = p.textContent.match(/\[(.+)\]/)?.[1]
    if (n)
      makeClickable(p, `TOPIC -n ${n}`)
  })
}

function handleTopic(content) {
  pagination(content)
  let headLine = getHeadLine(content)
  let [boardID, boardName, threadID] = parseHeadLine(headLine)?.slice(1)
  if (boardName!==0) {
    let html = `<span class="hwt-backlink">
      <span class="hwt-btn">
        <span class="hwt-cmdlink" data-command="BOARD -n ${boardID}">&lt; [${boardID}] ${boardName}</span>
      </span>
      [${threadID}]
    </span>`
    headLine[0].replaceWith(createElementFromHTML(html))
  }
  // let allPosts = document.querySelectorAll('.posts')
}


/*---------------------------------- CSS -----------------------------------*/
var injector = {
  inject: function(alias, css, position="beforeend") {
  var id = `injector:${alias}`
  var existing = document.getElementById(id)
  if(existing) {
    existing.innerHTML = css
    return
  }
  var head = document.head || document.getElementsByTagName('head')[0]
  head.insertAdjacentHTML(position, `<style type="text/css" id="${id}">${css}</style>`)
  },
  remove: function(alias) {
  var id = `injector:${alias}`
  var style = document.getElementById(id)
  if (style) {
    var head = document.head || document.getElementsByTagName('head')[0]
    if(head)
      head.removeChild(document.getElementById(id))
    }
  }
}

const baseCSS = GM_getResourceText("baseCSS")
injector.inject('hwt', baseCSS)


/*--------------------------- General utilities ----------------------------*/
EventTarget.prototype.delegateEventListener = function(types, targetSelectors, listener, options) {
  if (! (types instanceof Array))
    types = types.split(' ')
  if (! (targetSelectors instanceof Array))
    targetSelectors = [targetSelectors]
  types.forEach(type => {
    this.addEventListener(type, ev => {
      targetSelectors.some(selector => {
        if (ev.target.matches(selector)) {
          listener.bind(ev.target)(ev)
          return true
        }
      })
    }, options)
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes.
  return div.firstChild;
}


/*------------------------- App-specific utilities -------------------------*/
// Turns a text node into a "link"
function makeClickable(node, command) {
  node.replaceWith(createElementFromHTML(`<span class="hwt-cmdlink" data-command="${command}">${node.textContent}</span>`))
}
// Auto-inputting commands
document.body.delegateEventListener('click', '.hwt-cmdlink', async function() {
  let command = this.dataset.command
  , cmdLine = document.querySelector('#cmd')
  if (command && cmdLine) {
    let enter = () => cmdLine.dispatchEvent(new KeyboardEvent('keydown', {keyCode: 13})) // Simulatie pressing Enter
    if (isPathInView()) {
      command = command.split('')
      let ch
      while(ch = command.shift()) {
        await sleep(20).then(() => {
          cmdLine.value += ch
        })
      }
      await sleep(300).then(enter)
    }
    else {
      cmdLine.value = command
      enter()
    }
  }
})

function pagination(content=document.querySelector('.content')) {
  let html
  let found = [].find.call(content.childNodes, node => {
    let m
    if (node.nodeName == "#text" && (m = node.textContent.match(/Page ([0-9]+)\/([0-9]+)/)?.slice(1))) {
      let [current, total] = m.map(n => +n)
      html =
      `<span class="hwt-pagination">
        ${current > 1 ? 
          `<span class="hwt-cmdlink hwt-btn" data-command="FIRST">&lt;&lt;</span>
          <span class="hwt-cmdlink hwt-btn" data-command="PREV">&lt;</span>`
        :''}
        ${node.textContent}
        ${current < total ? 
          `<span class="hwt-cmdlink hwt-btn" data-command="NEXT">&gt;</span>
          <span class="hwt-cmdlink hwt-btn" data-command="LAST">&gt;&gt;</span>`
        :''}
      </span>`
      node.replaceWith(createElementFromHTML(html))
      return true
    }
    else return false
  })
  if (found) { // Copy bagination to bottom
    content.insertAdjacentHTML('beforeend', html)
  }
}

function isPathInView() { // dirty
  return ((document.querySelector('#path').getBoundingClientRect().bottom - document.querySelector('#wrapper').getBoundingClientRect().bottom) < 96)
}