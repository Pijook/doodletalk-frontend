export function Doodle({ variant = 'original' }: { variant?: 'original' | 'round' | 'wild' }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" aria-hidden="true" className="doodle">
      {variant === 'original' ? (
        <>
          <path
            d="M45 193c59-12 154-11 229 2"
            stroke="#b8c797"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="253" cy="49" r="20" fill="#f4c777" />
          <path
            d="M247 13l-2-8m34 25l8-5m-12 44l7 6m-60-33l-8-2"
            stroke="#d9aa55"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M84 115l57-61 63 61"
            fill="#eab79d"
            stroke="#384634"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M96 112v77h94v-77"
            fill="#f8ebc5"
            stroke="#384634"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M132 190v-47h25v47m-47-61h13v17h-13zm58 0h13v17h-13z"
            fill="#d6e5cd"
            stroke="#384634"
            strokeWidth="2.5"
          />
          <path
            d="M229 190v-53m0 26l-19-15m19 1l18-17"
            stroke="#384634"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M207 145c-28 1-29-28-11-35-7-27 31-40 42-18 30-4 37 29 16 38 3 19-29 25-30 13"
            fill="#bbd2a0"
            stroke="#384634"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M142 193l-12 25m26-25l13 26M65 179l-4-12m3 13l8-8"
            stroke="#849469"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : variant === 'round' ? (
        <>
          <path d="M51 197l211-2" stroke="#a4a5ca" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M79 118l68-71 66 80-134-9"
            fill="#ddc7f3"
            stroke="#5c4b70"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M93 121l5 72 96 2 1-70" stroke="#5c4b70" strokeWidth="4" />
          <path
            d="M128 194l3-41 27 1 4 40m-56-57l16 2-1 17-15-2z"
            stroke="#5c4b70"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="238" cy="112" r="31" fill="#c4daac" stroke="#5c4b70" strokeWidth="3" />
          <path
            d="M238 141l-2 54m-7-35l8 11"
            stroke="#5c4b70"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="64" cy="52" r="18" fill="#f3d988" />
          <path d="M52 52h23m-13-10v22" stroke="#bf9550" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M48 201q95-17 224 1" stroke="#5c645c" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M67 124l47-83 78 91m-115-9l10 72 93-3-1-63"
            stroke="#365456"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M107 192l-1-38 39 1 9 38m-59-58l-1 13 12-1-1-12z"
            stroke="#365456"
            strokeWidth="3"
          />
          <path d="M116 43l76 89-125-8z" fill="#f4c394" opacity=".7" />
          <path
            d="M226 194l8-78m-4 35l-21-19m23 10l20-22"
            stroke="#365456"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M213 137c-24 3-30-28-8-33-15-14-1-34 18-27 15-18 42-1 34 15 28 10 15 41-6 38-6 17-27 20-38 7z"
            stroke="#365456"
            strokeWidth="3"
            fill="#c2ddcc"
          />
          <path
            d="M43 59q12-16 24 0m185-24l5 8m-3-23l4-9m13 24l8-1m-38-2l-7-2"
            stroke="#d5a548"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}
export function HeroArtwork() {
  return (
    <div
      className="hero-art"
      aria-label="Example: three different interpretations of a house beside a tree"
    >
      <span className="art-caption">“A little house beside a tree…”</span>
      <svg className="sketch-arrow" viewBox="0 0 90 65" aria-hidden="true">
        <path
          d="M4 8c63-19 80 18 45 40m0 0l18-3m-18 3l3-18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div className="art-card original">
        <span className="tape" />
        <div className="card-caption">
          <span className="tiny-dot" />
          THE ORIGINAL
        </div>
        <Doodle />
        <span className="handwritten">what the host sees</span>
      </div>
      <div className="art-card interpretation one">
        <span className="card-caption">ONE IMAGINATION</span>
        <Doodle variant="round" />
      </div>
      <div className="art-card interpretation two">
        <span className="card-caption">ANOTHER IMAGINATION</span>
        <Doodle variant="wild" />
      </div>
      <span className="art-sticker">
        No two minds
        <br />
        draw alike.
      </span>
      <span className="art-spark">✳</span>
    </div>
  )
}
