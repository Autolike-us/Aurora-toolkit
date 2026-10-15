/** A pure-CSS picture of the Aurora studio, so the page needs no screenshots. */
export function StudioMock() {
  return (
    <div className="mock" aria-label="Preview of the Aurora studio">
      <div className="bar"><span>👁 <b>PREVIEW MODE</b> — nothing is sent</span><button type="button" tabIndex={-1}>Switch to live</button></div>
      <div className="live">
        <div className="row"><span>Live session</span><span className="chip">⚡ LIVE</span></div>
        <div className="progress"><i style={{ width: '40%' }} /></div>
        <div className="line">▶ Target 2 of 5 · @dabijou · post 2/3 · next post in 24s</div>
        <div className="sub">@dabijou: post 1 done ✓ · 1/3 on this profile</div>
        <div className="targets">
          <div>✓ <span>@ann · 3 done</span></div>
          <div className="cur">▶ <span>@dabijou</span></div>
          <div>○ <span>@cafe.lovers</span></div>
        </div>
      </div>
      <span className="float a">✓ Liked post</span>
      <span className="float b">↷ Already liked — skipped</span>
    </div>
  );
}
