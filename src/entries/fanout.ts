import { getPageTitleByBlockUid, getUidsFromButton } from "roam-client";
import { render } from "../components/Fanout";
import { createButtonObserver } from "../entry-helpers";

createButtonObserver({
  attribute: "fanout-game",
  shortcut: "fanout",
  render: (b) => {
    const blockId = b.closest(".roam-block").id;
    const { blockUid } = getUidsFromButton(b);
    const title = getPageTitleByBlockUid(blockUid);
    render({ p: b.parentElement, title, blockId });
  },
});
