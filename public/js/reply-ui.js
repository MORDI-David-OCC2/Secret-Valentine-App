import { getInboxId, getSessionToken, getMessageById } from "./auth.js";
import { dictionaries, setLang, getLang, t } from "./dictio.js";

export function wireReplyUI({ root, messageId, renderMessageDetail, sendReply }) {
  const replyBtn = root.querySelector("#replyBtn");
  const replyBody = root.querySelector("#replyBody");
  const replyStatus = root.querySelector("#replyStatus");
  if (!replyBtn || !replyBody || !replyStatus) return;

  const setReplyStatus = (msg, ok = true) => {
    replyStatus.style.display = "block";
    replyStatus.textContent = msg;
    replyStatus.style.color = ok ? "" : "#b00020";
  };

  replyBtn.addEventListener("click", async () => {
    const body = (replyBody.value || "").trim();
    if (!body) return setReplyStatus(t("replyEmpty"), false);

    try {
      replyBtn.disabled = true;
      setReplyStatus(t("sending"));

      await sendReply({
        inboxId: getInboxId(),
        messageId,
        body,
        sessionToken: getSessionToken(),
      });

      setReplyStatus(t("replySent")+"✅");

      const refreshed = await getMessageById(messageId);
      root.querySelector("#msgDetail").innerHTML = renderMessageDetail(
        refreshed.message,
        refreshed.replies || [],
        getInboxId()
      );

      // keep it feeling chatty
      const threadE1 = root.querySelector("#thread");
      if (threadE1) threadE1.scrollIntoView({ block: "end" });

      // re-wire after rerender
      wireReplyUI({ root, messageId, renderMessageDetail, sendReply });

      // focus input for quick back-and-forth
      const inp = root.querySelector("#replyBody");
      if (inp) inp.focus();
    } catch (e) {
      console.error(e);
      setReplyStatus(e.message || t("replyFailed"), false);
    } finally {
      replyBtn.disabled = false;
    }
  });
}
