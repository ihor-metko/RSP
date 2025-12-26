"use client";

interface ConfirmStepProps {
  success: boolean;
  message: string;
}

export function ConfirmStep({ success, message }: ConfirmStepProps) {
  return (
    <div className="im-wizard-step-content">
      <div className={`im-confirm-message ${success ? "im-confirm-success" : "im-confirm-error"}`}>
        <div className="im-confirm-icon">
          {success ? (
            <svg
              className="im-icon-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="im-icon-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
        <h3 className="im-confirm-title">
          {success ? "Success!" : "Error"}
        </h3>
        <p className="im-confirm-text">{message}</p>
      </div>
    </div>
  );
}
