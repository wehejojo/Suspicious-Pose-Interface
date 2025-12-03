import NavBar from '../../components/NavBar';

import CameraPosePredictor from '../../components/CameraPosePredictor';
import CameraPosePredictor2 from '../../components/CameraPosePredictor2';

import styles from './Feed.module.css';

export default function Feed() {
  return (
    <div className={styles.pageContainer}>
      <NavBar />
      <div className={styles.content}>
        <CameraPosePredictor />
        {/* <CameraPosePredictor2 /> */}
      </div>
    </div>
  );
}
