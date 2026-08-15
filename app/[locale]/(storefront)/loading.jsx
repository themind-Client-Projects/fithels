/**
 * Route-level loading state for the storefront.
 *
 * There was no `loading.jsx` or Suspense boundary anywhere in this route group,
 * and every storefront page is dynamically rendered behind Prisma queries to a
 * remote database. Until the server finished, the browser held the OLD page on
 * screen with no indication anything was happening — a tap on a product looked
 * like it had simply been ignored.
 *
 * Deliberately minimal, and deliberately NOT a facsimile of any particular
 * page: this covers the home page, the shop grid, product detail, checkout and
 * the account pages, so a layout-specific skeleton would be wrong more often
 * than right. It reserves the hero band and a product-grid rhythm, which is the
 * shape most of these routes share.
 */
export default function StorefrontLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>

      {/* Hero band — matches the real hero's height so the swap does not jump. */}
      <div style={{ position: "relative", width: "100%", height: "min(70vh, 700px)" }}>
        <span className="img-skeleton" />
      </div>

      <div className="container" style={{ paddingTop: "48px", paddingBottom: "48px" }}>
        {/* Section heading */}
        <div
          style={{
            position: "relative",
            height: "28px",
            width: "220px",
            margin: "0 auto 32px",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          <span className="img-skeleton" />
        </div>

        {/* Product grid rhythm: 4-up desktop, 2-up tablet, matching
            .tf-grid-layout so the real cards land where these sat. */}
        <div className="tf-grid-layout tf-col-2 lg-col-3 xl-col-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3 / 4",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <span className="img-skeleton" />
              </div>
              <div
                style={{
                  position: "relative",
                  height: "14px",
                  width: "75%",
                  margin: "12px 0 8px",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <span className="img-skeleton" />
              </div>
              <div
                style={{
                  position: "relative",
                  height: "14px",
                  width: "40%",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <span className="img-skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
