/** An illustrated, pure-CSS picture of the Aurora studio inside a tilted browser card. */
export function StudioMock() {
  return (
    <div className="art" aria-label="Illustration of the Aurora studio">
      <div className="orb one" /><div className="orb two" />
      <div className="label">A calmer way to show up.</div>
      <div className="bcard">
        <div className="chrome-bar"><i /><i /><i /><span>Aurora Studio</span></div>
        <div className="body">
          <div className="tabs"><b>✳</b><span /><span /><span /></div>
          <p className="mh">A little focus goes a long way.</p>
          <p className="sub">Set your intention. Preview your next move.</p>
          <div className="mbar"><span>👁 <b>PREVIEW MODE</b> — nothing is sent</span><button type="button" tabIndex={-1}>Switch to live</button></div>
          <div className="mlive">
            <div className="mrow"><span>Live session</span><span className="chip">⚡ LIVE</span></div>
            <div className="prog"><i style={{ width: '40%' }} /></div>
            <div className="mline">▶ Target 2 of 5 · @dabijou · post 2/3 · next post in 24s</div>
            <div className="msub">@dabijou: post 1 done ✓ · 1/3 on this profile</div>
            <div className="mt"><div>✓ <span>@ann · 3 done</span></div><div className="cur">▶ <span>@dabijou</span></div><div>○ <span>@cafe.lovers</span></div></div>
          </div>
        </div>
      </div>
      <div className="note-float"><span className="s">✦</span><div><b>You’re in the driver’s seat</b>Preview · Pause · Resume · Skip</div></div>
    </div>
  );
}
