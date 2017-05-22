/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(['./io', './cache', './bundle'], function (io) {
	io.cache.attach();
	io.bundle.attach();

	return io;
});
