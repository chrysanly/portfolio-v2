/**
 * The splash's mark and line on the ground. If a case study is not already in
 * the router cache, this holds its place — and RouteVeil, which went up on the
 * click, stays over it until the page itself says it has arrived
 * (`data-route-loading` is what tells the veil to wait). Under the veil it is
 * the same picture, so nothing flickers; on a direct load or a refresh it is
 * the loading state on its own.
 */
export default function Loading() {
  return (
    <div className="route-hold" data-route-loading aria-busy="true">
      <div className="veil__inner" aria-hidden="true">
        <div className="veil__mark">
          {'CHRYS'.split('').map((letter, i) => (
            <span key={letter + i} style={{ animationDelay: `${i * 45}ms` }}>
              {letter}
            </span>
          ))}
        </div>
        <span className="veil__bar">
          <i />
        </span>
      </div>
    </div>
  );
}
