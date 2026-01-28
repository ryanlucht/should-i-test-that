interface LandingPageProps {
  onStart: () => void;
}

/**
 * Landing page that introduces the A/B testing value calculation concept
 */
export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="max-w-2xl mx-auto text-center py-8">
      <div className="card">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Should I Run an A/B Test?
        </h1>

        <p className="text-lg text-slate-700 mb-6">
          You're about to launch a new feature. Should you A/B test it first,
          or just ship it? The answer depends on your <strong>uncertainty</strong>,
          the <strong>stakes</strong>, and whether that uncertainty crosses a
          meaningful <strong>threshold</strong>.
        </p>

        <div className="quote-block text-left mb-6">
          <p>
            "If you have a lot of uncertainty now, but reducing the uncertainty
            wouldn't change anything, there is no reason to measure. You already
            effectively know enough to make a decision."
          </p>
          <cite className="text-sm text-slate-500 not-italic mt-2 block">
            — Douglas Hubbard, "How to Measure Anything"
          </cite>
        </div>

        <p className="text-slate-600 mb-8">
          This tool calculates the{' '}
          <strong>Expected Value of Perfect Information (EVPI)</strong>—the
          maximum amount you should spend on an A/B test. If you can run
          the test for less than this amount, test it. If not, make a decision
          with what you know now.
        </p>

        <button
          onClick={onStart}
          className="btn-primary text-lg px-8 py-3"
        >
          Calculate Your Test Budget
        </button>
      </div>

      <footer className="mt-12 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
        <p>
          Based on <em>"How to Measure Anything"</em> Chapter 7 by Douglas Hubbard
        </p>
      </footer>
    </div>
  );
}
