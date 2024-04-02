import pino from 'pino';

const getLogger = () =>
	pino({
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
			},
		},
	});

export { getLogger };
