"use client";

export default function ConfirmSubmitButton({
  label,
  confirmMessage = "Anda yakin?",
  className = "",
}) {
  function handleClick(event) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
    }
  }

  return (
    <button type="submit" onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
