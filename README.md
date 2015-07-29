# ScratchX
Scratch Extension Site


## CSS
The project uses [SASS][] with [Bourbon][], [Neat][], and [Bitters][] for CSS.
To install `sass`,

    gem install sass

Don't edit `css/scratchx.css`, instead edit the files in `sass` and develop with:

    sass --watch sass:css

For a quick webserver at http://localhost:8000, run from this directory:

    python -m SimpleHTTPServer

If 8000 is in use, change the port number to e.g., 8001 with

	python -m SimpleHTTPServer 8001

[SASS]: http://sass-lang.com/
[Bourbon]: http://bourbon.io/
[Neat]: http://neat.bourbon.io/
[Bitters]: http://bitters.bourbon.io/
