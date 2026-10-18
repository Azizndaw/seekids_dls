import os
import subprocess

ffmpeg = r"C:\Users\user\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

img1 = r"C:\Users\user\.gemini\antigravity\brain\c639b075-10ad-4380-ac83-006154fbd43d\media__1791658243398.png"
img2 = r"C:\Users\user\.gemini\antigravity\brain\c639b075-10ad-4380-ac83-006154fbd43d\media__1791658278564.png"
a1 = "fin_part1.mp3"
a2 = "fin_part2.mp3"

# Dimensions of original video
proc = subprocess.run([ffmpeg, "-i", "dls_parent_portal_guide.mp4"], stderr=subprocess.PIPE, text=True)
output = proc.stderr
print(output)
# We will just force resolution to 720x1280 (typical vertical) for the images so they append nicely.
# We will use scale to pad them on black background.
res = "1080:1920"

# Make video 1
cmd1 = [
    ffmpeg, "-y", "-loop", "1", "-i", img1, "-i", a1,
    "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k", "-pix_fmt", "yuv420p",
    "-shortest",
    "-vf", f"scale={res}:force_original_aspect_ratio=decrease,pad={res}:(ow-iw)/2:(oh-ih)/2:black",
    "part1.mp4"
]
subprocess.run(cmd1)

# Make video 2
cmd2 = [
    ffmpeg, "-y", "-loop", "1", "-i", img2, "-i", a2,
    "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k", "-pix_fmt", "yuv420p",
    "-shortest",
    "-vf", f"scale={res}:force_original_aspect_ratio=decrease,pad={res}:(ow-iw)/2:(oh-ih)/2:black",
    "part2.mp4"
]
subprocess.run(cmd2)

# Now we need to normalize dls_parent_portal_guide.mp4 to the same resolution and Framerate just in case, or we use a filter_complex.
# Since simple concat requires exact same resolution, SAR, audio sample rate, we re-encode the parts to match the original exactly.

# Let's write a file for the concat demuxer
with open("list.txt", "w") as f:
    f.write("file 'dls_parent_portal_guide.mp4'\n")
    f.write("file 'part1.mp4'\n")
    f.write("file 'part2.mp4'\n")

# concat
# Since resolutions might mis-match slightly, we'll re-encode the final to be safe, but just re-encoding the parts matching the original is better.
# Let's scale original as well to ensure total conformity.
cmd3 = [
    ffmpeg, "-y", "-i", "dls_parent_portal_guide.mp4",
    "-to", "33",
    "-vf", f"scale={res}:force_original_aspect_ratio=decrease,pad={res}:(ow-iw)/2:(oh-ih)/2:black,setsar=1",
    "-r", "24", "-c:v", "libx264", "-c:a", "aac", "part0.mp4"
]
subprocess.run(cmd3)

with open("list2.txt", "w") as f:
    f.write("file 'part0.mp4'\n")
    f.write("file 'part1.mp4'\n")
    f.write("file 'part2.mp4'\n")

cmd4 = [
    ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", "list2.txt",
    "-c", "copy", "Guide_Parent_Complet_dls_2027.mp4"
]
subprocess.run(cmd4)

print("Finish processing Guide_Parent_Complet_dls_2027.mp4")
