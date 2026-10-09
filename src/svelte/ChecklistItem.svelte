<script lang="ts">
  import type { App } from "obsidian"

  import type { LookAndFeel, TodoItem } from "src/_types"
  import { navToFile, toggleTodoItem } from "src/utils"
  import CheckCircle from "./CheckCircle.svelte"

  export let item: TodoItem
  export let lookAndFeel: LookAndFeel
  export let app: App

  let contentDiv: HTMLDivElement

  const toggleItem = async (item: TodoItem) => {
    toggleTodoItem(item, app)
  }

  const handleClick = (ev: MouseEvent | KeyboardEvent, item: TodoItem) => {
    const target = ev.target
    if (!(target instanceof Element)) return
    const anchor = target.closest("a")
    if (anchor) {
      ev.stopPropagation()
      if (anchor.dataset.type === "link" && anchor.dataset.filepath) {
        ev.preventDefault()
        navToFile(app, anchor.dataset.filepath, ev, item.line)
      }
    } else {
      navToFile(app, item.filePath, ev, item.line)
    }
  }

  const handleKeydown = (ev: KeyboardEvent) => {
    if (ev.key !== "Enter") return
    if (ev.target === ev.currentTarget) {
      ev.preventDefault()
      navToFile(app, item.filePath, ev, item.line)
    } else if (ev.target instanceof Element) {
      const anchor = ev.target.closest("a")
      // Native links activate themselves; generated wiki links have no href.
      if (anchor?.dataset.filepath && !anchor.hasAttribute("href")) {
        handleClick(ev, item)
      }
    }
  }
  $: {
    if (contentDiv) contentDiv.innerHTML = item.rawHTML
  }
</script>

<li class={`${lookAndFeel}`}>
  <button
    type="button"
    class="toggle"
    on:click={(ev) => {
      toggleItem(item)
      ev.stopPropagation()
    }}
  >
    <CheckCircle checked={item.checked} />
  </button>
  <div
    bind:this={contentDiv}
    on:click={(ev) => handleClick(ev, item)}
    on:keydown={handleKeydown}
    role="link"
    tabindex="0"
    class="content"
  />
</li>

<style>
  li {
    display: flex;
    align-items: center;
    background-color: var(--checklist-listItemBackground);
    border-radius: var(--checklist-listItemBorderRadius);
    margin: var(--checklist-listItemMargin);
    cursor: pointer;
    transition: background-color 100ms ease-in-out;
  }
  li:hover {
    background-color: var(--checklist-listItemBackground--hover);
  }
  .toggle {
    padding: var(--checklist-togglePadding);
    background: transparent;
    box-shadow: var(--checklist-listItemBoxShadow);
    flex-shrink: 1;
    width: initial;
  }
  .content {
    padding: var(--checklist-contentPadding);
    flex: 1;
    font-size: var(--checklist-contentFontSize);
  }
  .content:focus-visible,
  .content :global(a[role="link"]:focus-visible) {
    outline: 2px solid var(--checklist-accentColor);
    outline-offset: 2px;
  }
  .compact {
    bottom: var(--checklist-listItemMargin--compact);
  }
  .compact > .content {
    padding: var(--checklist-contentPadding--compact);
  }
  .compact > .toggle {
    padding: var(--checklist-togglePadding--compact);
  }
  .toggle:hover {
    opacity: 0.8;
  }
</style>
