const styles = {
  container: {
    fontFamily: "'Poppins', sans-serif",
    height: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #ffffff, #f0f4ff)',
    position: 'relative',
    overflow: 'hidden',
  },
  box: {
    backgroundColor: '#ffffff',
    padding: '40px 30px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(4px)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: '64px',
    color: '#0d47a1',
    fontWeight: 700,
    marginBottom: '20px',
  },
  text: {
    fontSize: '18px',
    color: '#333333',
  },
};

export default function NotFound() {
  return (
    <>
      <div style={styles.container}>
        <div style={styles.box}>
          <h1 style={styles.title}>404</h1>
          <p style={styles.text}>Page Not Found</p>
        </div>
      </div>
    </>
  );
}