define(['./io', './cache', './bundle'], function (io) {
	io.cache.attach();
	io.bundle.attach();

	return io;
});
