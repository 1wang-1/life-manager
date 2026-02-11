import { Composition } from 'remotion';
import { LifeManagerDemo } from './LifeManagerDemo';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="LifeManagerDemo"
				component={LifeManagerDemo}
				durationInFrames={1080} // 36秒 @ 30fps (6场景 x 6秒)
				fps={30}
				width={1920}
				height={1080}
			/>
		</>
	);
};