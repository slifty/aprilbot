import pino from 'pino';

const getLogger = () =>
	pino({
		level: process.env.LOG_LEVEL ?? 'info',
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
			},
		},
	});

export { getLogger };
