import svgPaths from "./svg-kcw2rymt7y";

function MdiHeart() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="mdi:heart">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="mdi:heart">
          <path d={svgPaths.p18ccc940} fill="var(--fill-0, #DB8C8F)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame1() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex gap-px items-end left-[calc(50%-5px)] top-[827px]">
      <p className="font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[normal] relative shrink-0 text-[15px] text-black text-center">{`made by D&F with `}</p>
      <MdiHeart />
    </div>
  );
}

function RoentgenEnvelope() {
  return (
    <div className="relative shrink-0 size-[42px]" data-name="roentgen:envelope">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 42 42">
        <g id="roentgen:envelope">
          <path d={svgPaths.p33e0eb00} fill="var(--fill-0, #DB8C8F)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex gap-[6px] items-center left-1/2 top-[93px] w-[360px]">
      <RoentgenEnvelope />
      <p className="font-['Kaushan_Script:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[35px] text-black w-[369px] whitespace-pre-wrap">Compose your letter</p>
    </div>
  );
}

function FaSolidUserFriends({ className }: { className?: string }) {
  return (
    <div className={className || "h-[27px] relative shrink-0 w-[34px]"} data-name="fa-solid:user-friends">
      <div className="absolute inset-[6.25%_0]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 34 23.625">
          <path d={svgPaths.p1e4e6380} fill="var(--fill-0, white)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[9px] items-center left-[184px] top-[15px] w-[44px]">
      <FaSolidUserFriends />
      <p className="font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[normal] min-w-full relative shrink-0 text-[15px] text-black w-[min-content] whitespace-pre-wrap">Friend</p>
    </div>
  );
}

function MdiFamily({ className }: { className?: string }) {
  return (
    <div className={className || "relative shrink-0 size-[39px]"} data-name="mdi:family">
      <div className="absolute inset-[16.67%_8.33%_16.67%_8.34%]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32.498 26">
          <path d={svgPaths.p2d760800} fill="var(--fill-0, white)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3px] items-end left-[37px] top-[122px] w-[44px]">
      <MdiFamily />
      <p className="font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[normal] min-w-full relative shrink-0 text-[15px] text-black w-[min-content] whitespace-pre-wrap">Family</p>
    </div>
  );
}

function MaterialSymbolsEcgHeart({ className }: { className?: string }) {
  return (
    <div className={className || "relative shrink-0 size-[34px]"} data-name="material-symbols:ecg-heart">
      <div className="absolute inset-[12.5%_8.33%]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28.3333 25.5">
          <path d={svgPaths.p6a77e80} fill="var(--fill-0, white)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Frame6() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[5px] items-start left-[189px] top-[123px] w-[43px]">
      <MaterialSymbolsEcgHeart />
      <p className="font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[normal] min-w-full relative shrink-0 text-[15px] text-black w-[min-content] whitespace-pre-wrap">Crush</p>
    </div>
  );
}

function TablerHeartFilled({ className }: { className?: string }) {
  return (
    <div className={className || "relative shrink-0 size-[35px]"} data-name="tabler:heart-filled">
      <div className="absolute inset-[12.45%_8.35%_12.5%_8.28%]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29.1797 26.2668">
          <path d={svgPaths.p26b0be00} fill="var(--fill-0, white)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[41px] top-[15px] w-[36px]">
      <TablerHeartFilled />
      <p className="font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[normal] min-w-full relative shrink-0 text-[15px] text-black w-[min-content] whitespace-pre-wrap">Love</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute h-[193px] left-[67px] top-[591px] w-[264px]">
      <div className="absolute bg-[rgba(219,140,143,0.18)] border border-[#db8c8f] border-solid h-[83px] left-0 rounded-[10px] top-0 w-[117px]" />
      <div className="absolute bg-[rgba(219,140,143,0.18)] border border-[#db8c8f] border-solid h-[83px] left-[147px] rounded-[10px] top-0 w-[117px]" />
      <div className="absolute bg-[rgba(219,140,143,0.18)] border border-[#db8c8f] border-solid h-[83px] left-0 rounded-[10px] top-[110px] w-[117px]" />
      <div className="absolute bg-[rgba(219,140,143,0.18)] border border-[#db8c8f] border-solid h-[83px] left-[147px] rounded-[10px] top-[110px] w-[117px]" />
      <Frame4 />
      <Frame5 />
      <Frame6 />
      <Frame3 />
    </div>
  );
}

export default function IPhone() {
  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative size-full" data-name="iPhone 17 - 11">
      <Frame1 />
      <Frame />
      <p className="-translate-x-1/2 absolute font-['Inter:Extra_Light',sans-serif] font-extralight leading-[normal] left-[calc(50%-2.5px)] not-italic text-[24px] text-black text-center top-[177px] w-[321px] whitespace-pre-wrap">Write a heartful message to someone special</p>
      <div className="absolute h-0 left-0 top-[156px] w-[402px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 402 1">
            <line id="Line 1" stroke="var(--stroke-0, black)" x2="402" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <div className="absolute bg-[rgba(255,255,255,0.63)] h-[882px] left-[21px] rounded-[10px] top-[256px] w-[356px]" />
      <p className="absolute font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[0] left-[50px] text-[#db8c8f] text-[15px] top-[285px]">
        <span className="font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic">To:</span>
        <span className="leading-[normal]">{` `}</span>
        <span className="font-['Inter:Light_Italic',sans-serif] font-light leading-[normal] text-[rgba(0,0,0,0.64)]">Write the name of the person</span>
        <span className="leading-[normal]">{` `}</span>
      </p>
      <div className="absolute bg-[rgba(219,140,143,0.18)] border border-[#db8c8f] border-solid h-[54px] left-[51px] rounded-[10px] top-[312px] w-[300px]" />
      <p className="absolute font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[normal] left-[69px] text-[15px] text-[rgba(0,0,0,0.36)] top-[330px]">Olivia...</p>
      <p className="absolute font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[0] left-[51px] text-[#db8c8f] text-[15px] top-[399px]">
        <span className="font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic">From:</span>
        <span className="leading-[normal]">{` `}</span>
        <span className="font-['Inter:Light_Italic',sans-serif] font-light leading-[normal] text-[rgba(0,0,0,0.64)]">Reveal your identity or not</span>
        <span className="leading-[normal]">{` `}</span>
      </p>
      <div className="absolute bg-[rgba(219,140,143,0.18)] border border-[#db8c8f] border-solid h-[54px] left-[52px] rounded-[10px] top-[426px] w-[300px]" />
      <p className="absolute font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[normal] left-[70px] text-[15px] text-[rgba(0,0,0,0.36)] top-[444px]">Your name...</p>
      <p className="absolute font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[0] left-[59px] text-[#db8c8f] text-[15px] top-[549px]">
        <span className="font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic">Type:</span>
        <span className="leading-[normal]">{` `}</span>
        <span className="font-['Inter:Light_Italic',sans-serif] font-light leading-[normal] text-[rgba(0,0,0,0.64)]">(love, friend, family, crush)</span>
      </p>
      <Frame2 />
      <div className="absolute bg-white border border-black border-solid left-[59px] rounded-[2px] size-[15px] top-[505px]" />
      <p className="absolute font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[normal] left-[85px] text-[15px] text-black top-[504px]">Send anonymously</p>
      <p className="absolute font-['Inter:Thin_Italic',sans-serif] font-thin italic leading-[normal] left-[21px] text-[25px] text-black top-[40px]">← Back</p>
    </div>
  );
}