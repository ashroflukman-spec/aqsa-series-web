# Aqsa Series TV launcher

This small Android TV launcher opens the dedicated TV interface at
`https://www.aqsaseries.com/tv`. The interface itself is served by the Aqsa
Series web app and uses the same published audio and video catalog as the
phone app. The launcher is optional: any Smart TV browser can open the URL.

Open this directory in Android Studio, install the Android SDK, and build the
`app` module. The launcher has a distinct application ID from the existing
household TV shortcut, so installing it does not replace that shortcut. To
make this version the household dock tile, install the APK and select
`com.aqsaseries.tv` in the dock configuration.

Playback requires an internet connection. YouTube availability depends on
the video owner allowing embedded playback and the TV browser supporting the
YouTube player. A link to YouTube is available from the video controls.
