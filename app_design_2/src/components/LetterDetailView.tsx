// ...inside your return (the AnimatePresence part)
// Replace the "Content wrapper" <motion.div ...> with the version below:

<motion.div
  className="relative w-full max-w-[360px]"
  style={{
    height:
      "calc(100dvh - max(28px, env(safe-area-inset-top)) - max(28px, env(safe-area-inset-bottom)) - 24px)",
    transform: "translateY(-40px)",
  }}
  initial={{ scale: 0.6, opacity: 0, rotateY: -60 }}
  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
  exit={{ scale: 0.6, opacity: 0, rotateY: 60 }}
  transition={{ type: "spring", stiffness: 220, damping: 22 }}
>
  <motion.div className={`${color} rounded-[20px] shadow-2xl relative overflow-hidden h-full`}>
    {/* Close stays fixed */}
    <motion.button
      onClick={onClose}
      className="absolute top-3 right-3 size-10 rounded-full bg-white/90 flex items-center justify-center text-[color:var(--text)] font-bold text-xl shadow-lg z-20"
      whileHover={{ scale: 1.06, rotate: 90 }}
      whileTap={{ scale: 0.94 }}
      aria-label={language === "en" ? "Close" : "Fermer"}
    >
      ✕
    </motion.button>

    {/* ✅ 3-zone layout: header (fixed) + body (scroll) + footer (fixed) */}
    <div className="h-full flex flex-col">
      {/* HEADER (fixed) */}
      <div className="flex-none px-6 pt-6 pb-4 relative">
        {/* Decorative hearts */}
        <motion.div
          className="absolute top-4 left-4 opacity-20 pointer-events-none"
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
        >
          <MdiHeart className="size-[36px]" />
        </motion.div>
        <motion.div
          className="absolute bottom-4 right-4 opacity-20 pointer-events-none"
          animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 2, delay: 1 }}
        >
          <MdiHeart className="size-[36px]" />
        </motion.div>

        {/* Header icon */}
        <div className="flex justify-center mb-3 pt-1">
          <OvalLoveIcon />
        </div>

        {/* Type badge */}
        <div className="flex justify-center mb-3">
          <div className="bg-white/30 backdrop-blur-sm px-5 py-2 rounded-full border border-white/50 flex items-center gap-2">
            <FlowerIcon type={letter.type} size="sm" />
          </div>
        </div>

        {/* From & Date */}
        <div className="space-y-2 text-center">
          <div>
            <p className="italic text-[12px] text-black/70 font-['Cormorant_Garamond',serif]">
              {language === "en" ? "From" : "De"}
            </p>
            <p className="font-['Playfair_Display',serif] italic font-bold text-[20px] text-black drop-shadow">
              {letter.from}
            </p>
          </div>
          <div>
            <p className="italic text-[12px] text-black/70 font-['Cormorant_Garamond',serif]">
              {language === "en" ? "Date" : "Date"}
            </p>
            <p className="font-['Cormorant_Garamond',serif] italic font-semibold text-[14px] text-black">
              {letter.date}
            </p>
          </div>
        </div>

        <div className="h-px bg-black/30 mt-4" />
      </div>

      {/* BODY (the ONLY scroll area) */}
      <div className="flex-1 min-h-0 px-6 pb-4 overflow-y-auto">
        {!replyEnabled ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-[15px] p-5 border border-white/30 relative">
            <div className="absolute top-2 left-3 text-black/25 font-serif text-[52px] leading-none">"</div>
            <div className="absolute bottom-2 right-3 text-black/25 font-serif text-[52px] leading-none">"</div>

            <div className="relative z-10 pt-5 pb-4">
              {letter.message ? (
                <p className="font-['Cormorant_Garamond',serif] italic text-[16px] leading-relaxed text-black text-center whitespace-pre-wrap">
                  {letter.message}
                </p>
              ) : (
                <p className="font-['Cormorant_Garamond',serif] italic text-[16px] leading-relaxed text-black/80 text-center">
                  {language === "en"
                    ? "A secret message just for you..."
                    : "Un message secret rien que pour toi..."}
                </p>
              )}
            </div>
          </div>
        ) : (
          // ✅ Remove nested scroll here. No max-h/overflow-y-auto inside.
          <div className="bg-white/15 backdrop-blur-sm rounded-[15px] p-4 border border-white/25">
            <div className="space-y-3">
              {/* original bubble */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="rounded-[18px] px-4 py-3 bg-white/30 border border-white/30">
                    <p className="font-['Cormorant_Garamond',serif] italic text-[15px] leading-relaxed text-black whitespace-pre-wrap">
                      {letter.message ||
                        (language === "en"
                          ? "A secret message just for you..."
                          : "Un message secret rien que pour toi...")}
                    </p>
                  </div>
                  <p className="font-['Cormorant_Garamond',serif] italic text-[11px] text-black/50 mt-1 ml-2">
                    {formatTimestamp(message.createdAt, language)}
                  </p>
                </div>
              </div>

              {/* replies */}
              {replies.map((r) => (
                <div
                  key={r.id}
                  className={`flex ${r.from === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] ${r.from === "me" ? "items-end" : "items-start"} flex flex-col`}
                  >
                    <div
                      className={`rounded-[18px] px-4 py-3 border border-white/30 ${
                        r.from === "me" ? "bg-white/45" : "bg-white/25"
                      }`}
                    >
                      <p className="font-['Cormorant_Garamond',serif] italic text-[15px] leading-relaxed text-black whitespace-pre-wrap">
                        {r.body}
                      </p>
                    </div>
                    <p
                      className={`font-['Cormorant_Garamond',serif] italic text-[11px] text-black/50 mt-1 ${
                        r.from === "me" ? "mr-2" : "ml-2"
                      }`}
                    >
                      {formatTimestamp(r.createdAt, language)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* To */}
        <div className="mt-4 text-center">
          <p className="italic text-[12px] text-black/70 font-['Cormorant_Garamond',serif]">
            {language === "en" ? "To" : "À"}
          </p>
          <p className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-black drop-shadow">
            {letter.to}
          </p>
        </div>

        {/* Anonymous */}
        {letter.isAnonymous && (
          <div className="mt-4 flex justify-center">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/40 flex items-center gap-2">
              <p className="font-['Cormorant_Garamond',serif] italic text-[12px] text-black">
                {language === "en" ? "Sent anonymously" : "Envoyé anonymement"}
              </p>
            </div>
          </div>
        )}

        {/* ✅ add bottom spacer so last bubble isn’t hidden behind footer */}
        <div className="h-3" />
      </div>

      {/* FOOTER (fixed) */}
      <div className="flex-none px-6 pb-6 pt-2">
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-[14px] h-[48px] bg-white/90 text-[color:var(--text)] font-['Playfair_Display',serif] italic font-bold text-[14px] shadow-md"
          >
            {language === "en" ? "Close" : "Fermer"}
          </button>

          {replyEnabled && (
            <button
              onClick={() => setShowReply(true)}
              className={`flex-1 rounded-[14px] h-[48px] ${color} text-white font-['Playfair_Display',serif] italic font-bold text-[14px] shadow-md`}
            >
              {language === "en" ? "Reply" : "Répondre"}
            </button>
          )}
        </div>
      </div>
    </div>
  </motion.div>
</motion.div>