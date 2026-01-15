import { getInboxId, getSessionToken, getMessageById } from "./auth.js";

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
    if (!body) return setReplyStatus("Write something first.", false);

    try {
      replyBtn.disabled = true;
      setReplyStatus("Sending…");

      await sendReply({
        inboxId: getInboxId(),
        messageId,
        body,
        sessionToken: getSessionToken(),
      });

      setReplyStatus("Reply sent ✅");

      const refreshed = await getMessageById(messageId);
      root.querySelector("#msgDetail").innerHTML = renderMessageDetail(
        refreshed.message,
        refreshed.replies || []
      );

      // re-wire after rerender
      wireReplyUI({ root, messageId, renderMessageDetail, sendReply });
    } catch (e) {
      console.error(e);
      setReplyStatus(e.message || "Failed to send reply.", false);
    } finally {
      replyBtn.disabled = false;
    }
  });
}
