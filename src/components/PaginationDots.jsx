const PaginationDots = ({ total = 0, currentIndex = 0 }) => {
  const safeTotal = Math.max(0, Number(total) || 0);

  if (safeTotal <= 1) {
    return null;
  }

  return (
    <div className="pagination-dots" aria-label="Vị trí trang">
      {Array.from({ length: safeTotal }).map((_, index) => (
        <span
          key={index}
          className={
            index === currentIndex
              ? 'pagination-dot active'
              : 'pagination-dot'
          }
          aria-current={index === currentIndex ? 'page' : undefined}
        />
      ))}
    </div>
  );
};

export default PaginationDots;
