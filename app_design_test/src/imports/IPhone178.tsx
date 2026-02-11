import svgPaths from "./svg-zn5hjk1775";

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

function Frame() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0 w-[266px]">
      <MdiHeart />
      <p className="font-['Kaushan_Script:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[35px] text-black w-[369px] whitespace-pre-wrap">Secret Valentine</p>
    </div>
  );
}

function MdiHeart1() {
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

function Frame2() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex gap-[11px] h-[44px] items-center left-[calc(50%+0.5px)] top-[97px] w-[307px]">
      <Frame />
      <MdiHeart1 />
    </div>
  );
}

function MdiHeart2() {
  return (
    <div className="absolute left-[157px] size-[88px] top-[435px]" data-name="mdi:heart">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 88 88">
        <g id="mdi:heart">
          <path d={svgPaths.p20134ac0} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function MdiPen() {
  return (
    <div className="absolute left-[157px] size-[88px] top-[618px]" data-name="mdi:pen">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 88 88">
        <g id="mdi:pen">
          <path d={svgPaths.p2e9e3140} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function MdiHeart3() {
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
      <MdiHeart3 />
    </div>
  );
}

export default function IPhone() {
  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative size-full" data-name="iPhone 17 - 8">
      <Frame2 />
      <div className="-translate-x-1/2 absolute font-['Inter:Light',sans-serif] font-light leading-[normal] left-[calc(50%-0.5px)] not-italic text-[24px] text-black text-center top-[189px] w-[321px] whitespace-pre-wrap">
        <p className="mb-0">{`"Welcome to Secret Valentine. `}</p>
        <p>{`Reveal your heart, keep your mystery. Send a message to the one you love, without them knowing it’s you... yet."`}</p>
      </div>
      <div className="absolute bg-[#db8c8f] h-[172px] left-[62px] rounded-[10px] top-[399px] w-[284px]" />
      <div className="-translate-x-1/2 absolute bg-[#db8c8f] h-[172px] left-1/2 rounded-[10px] top-[592px] w-[284px]" />
      <p className="absolute font-['Inter:Light',sans-serif] font-light leading-[normal] left-[132px] not-italic text-[15px] text-black top-[713px]">Write your message</p>
      <MdiHeart2 />
      <MdiPen />
      <p className="absolute font-['Inter:Light',sans-serif] font-light leading-[normal] left-[111px] not-italic text-[15px] text-black top-[530px]">Check your received letter</p>
      <Frame1 />
      <div className="absolute h-0 left-0 top-[156px] w-[402px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 402 1">
            <line id="Line 1" stroke="var(--stroke-0, black)" x2="402" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}