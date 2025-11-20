import { useEffect, useState } from 'react';
import axios from 'axios';

import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [poseData, setPoseData] = useState(null);

  useEffect(() => {
    axios.get('/api/suspicious_poses')
      .then(res => setPoseData(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className={styles.container}>
      <h2 className={`${styles.title} login-title`}>Dashboard</h2>
      {poseData ? (
        <pre className={styles.preData}>
          {poseData && Object.keys(poseData).length > 0
            ? JSON.stringify(poseData, null, 2)
            : 'No data.'}
        </pre>
      ) : (
        <p className={styles.loading}>Loading...</p>
      )}
    </div>
  );
}
