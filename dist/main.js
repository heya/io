(function(_,f){f(window.heya.io,window.heya.io,window.heya.io);})
(['./io', './cache', './bundle'], function (io) {
	io.cache.attach();
	io.bundle.attach();

	return io;
});
