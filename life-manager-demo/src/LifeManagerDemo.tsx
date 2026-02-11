import {
	AbsoluteFill,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

// 截图路径
const screenshots = {
	home: '/screenshots/首页.PNG',
	taskBoard: '/screenshots/任务页看板.PNG',
	focus: '/screenshots/本周成长专注.PNG',
	review: '/screenshots/复盘图表与总结.PNG',
	diary: '/screenshots/日记页面.PNG',
	settings: '/screenshots/设置页面.PNG',
};

export const LifeManagerDemo: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// 场景切换逻辑（每6秒切换，共6个场景 = 36秒）
	const currentScene = Math.floor(frame / (fps * 6));

	// 淡入淡出动画
	const opacity = spring({
		frame: frame % (fps * 6),
		fps,
		config: { damping: 20 },
	});

	const scenes = [
		{
			title: "人生管理器",
			subtitle: "把「任务、专注、复盘」放在一个地方的桌面效率工具",
			content: (
				<div style={styles.features}>
					<div style={styles.feature}>✅ 任务管理</div>
					<div style={styles.feature}>⏱️ 专注计时</div>
					<div style={styles.feature}>📊 数据复盘</div>
				</div>
			)
		},
		{
			title: "任务管理",
			subtitle: "创建任务，清晰分类。从待办到进行中，再到已完成。",
			image: screenshots.taskBoard
		},
		{
			title: "专注计时",
			subtitle: "一键开启专注模式，支持倒计时和正向计时，进入无干扰环境。",
			image: screenshots.focus
		},
		{
			title: "数据复盘",
			subtitle: "用数据见证成长，持续优化个人效率体系。",
			image: screenshots.review
		},
		{
			title: "日记功能",
			subtitle: "记录生活点滴，随心记、学习总结、本周成长，让思考与反思成为进步的阶梯。",
			image: screenshots.diary
		},
		{
			title: "现在开始",
			subtitle: "打造属于你的高效人生！数据安全本地存储，完全掌控个人隐私。",
			image: screenshots.home
		}
	];

	const currentSceneData = scenes[currentScene % scenes.length];

	return (
		<AbsoluteFill
			style={{
				...styles.container,
				background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
			}}
		>
			<div
				style={{
					...styles.sceneContainer,
					opacity,
				}}
			>
				<div style={styles.center}>
					<h1 style={styles.sceneTitle}>{currentSceneData.title}</h1>
					<p style={styles.description}>{currentSceneData.subtitle}</p>
					
					{currentSceneData.image && (
						<div style={styles.screenshotContainer}>
							<img src={currentSceneData.image} style={styles.screenshot} alt={currentSceneData.title} />
						</div>
					)}
					
					{currentSceneData.content}
				</div>
			</div>
		</AbsoluteFill>
	);
};

const styles: Record<string, React.CSSProperties> = {
	container: {
		fontFamily: 'Arial, sans-serif',
		color: 'white',
	},
	center: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		textAlign: 'center',
		padding: 60,
	},
	sceneTitle: {
		fontSize: 80,
		fontWeight: 'bold',
		marginBottom: 30,
		textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
	},
	description: {
		fontSize: 28,
		maxWidth: 800,
		lineHeight: 1.5,
		marginBottom: 30,
	},
	features: {
		display: 'flex',
		gap: 30,
		marginTop: 20,
	},
	feature: {
		background: 'rgba(255,255,255,0.2)',
		padding: '20px 40px',
		borderRadius: 15,
		fontSize: 24,
		backdropFilter: 'blur(10px)',
	},
	screenshotContainer: {
		background: 'rgba(255,255,255,0.1)',
		padding: 20,
		borderRadius: 20,
		backdropFilter: 'blur(10px)',
		marginBottom: 30,
		maxWidth: 1200,
		maxHeight: 600,
		overflow: 'hidden',
	},
	screenshot: {
		width: '100%',
		height: 'auto',
		maxHeight: 560,
		objectFit: 'contain',
		borderRadius: 10,
	},
	sceneContainer: {
		flex: 1,
		display: 'flex',
	},
};