export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"
        crossOrigin="anonymous"
      />
      <style>{`
        #swagger-ui .topbar { display: none; }
      `}</style>
      {children}
    </>
  );
}
