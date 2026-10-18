import os
import math
from moviepy.editor import VideoFileClip, ImageClip, concatenate_videoclips, AudioFileClip, concatenate_audioclips, CompositeVideoClip, CompositeAudioClip, clips_array
import moviepy.video.fx.all as vfx
from gtts import gTTS

def create_audio():
    print("Generating audio...")
    part1 = "Chers parents, bienvenue sur SeeKids ! Pour vous connecter, entrez votre numéro et votre mot de passe, par défaut : d-l-s-2-0-2-7."
    part2 = "Depuis votre espace, suivez toute la scolarité : les notes, votre planning et vos factures."
    part3 = "Nouveauté ! Vous pouvez désormais cliquer sur les compteurs d'absences, ou de retards de votre enfant."
    part4 = "Pour visualiser l'historique complet, vous le justifier, ou signaler une absence programmée. Bonne année scolaire !"

    gTTS(text=part1, lang='fr').save('audio1.mp3')
    gTTS(text=part2, lang='fr').save('audio2.mp3')
    gTTS(text=part3, lang='fr').save('audio3.mp3')
    gTTS(text=part4, lang='fr').save('audio4.mp3')

    return (AudioFileClip('audio1.mp3'),
            AudioFileClip('audio2.mp3'),
            AudioFileClip('audio3.mp3'),
            AudioFileClip('audio4.mp3'))

def assemble_video():
    print("Loading resources...")
    a1, a2, a3, a4 = create_audio()
    
    # Load base video
    video = VideoFileClip('dls_parent_portal_guide.mp4').without_audio()
    print(f"Original video duration: {video.duration}s. Render size: {video.w}x{video.h}")
    
    # Load images
    img1_path = r'C:\Users\user\.gemini\antigravity\brain\c639b075-10ad-4380-ac83-006154fbd43d\media__1791658243398.png'
    img2_path = r'C:\Users\user\.gemini\antigravity\brain\c639b075-10ad-4380-ac83-006154fbd43d\media__1791658278564.png'
    
    # Image 1 (compteurs absences) set to duration of part 3
    img1 = ImageClip(img1_path).set_duration(a3.duration)
    # resize keeping aspect ratio
    scale_w = video.w / img1.w
    img1 = img1.resize(width=video.w)
    
    # We want it centered on a black background
    bg1 = CompositeVideoClip([img1.set_pos('center')], size=(video.w, video.h)).set_duration(a3.duration)
    bg1 = bg1.set_audio(a3)
    
    # Image 2 (bouton signaler) set to duration of part 4
    img2 = ImageClip(img2_path).set_duration(a4.duration)
    img2 = img2.resize(width=video.w)
    bg2 = CompositeVideoClip([img2.set_pos('center')], size=(video.w, video.h)).set_duration(a4.duration)
    bg2 = bg2.set_audio(a4)
    
    audio_video_needed_duration = a1.duration + a2.duration
    
    # Option 1: loop the video if it's too short, or slow it down.
    if video.duration < audio_video_needed_duration:
        # Loop the video to match the audio duration
        print("Looping video to match audio length...")
        # Since vfx.loop can be buggy, we'll repeat it mathematically
        repeats = math.ceil(audio_video_needed_duration / video.duration)
        v_synced = concatenate_videoclips([video] * repeats).subclip(0, audio_video_needed_duration)
    else:
        # Just use the necessary portion
        v_synced = video.subclip(0, audio_video_needed_duration)
        
    v_synced = v_synced.set_audio(concatenate_audioclips([a1, a2]))
    
    print("Concatenating all parts...")
    final_video = concatenate_videoclips([v_synced, bg1, bg2], method="compose")
    
    output_filename = 'Nouveau_Guide_Parent_SeeKids.mp4'
    print(f"Rendering to {output_filename}...")
    final_video.write_videofile(output_filename, fps=24, codec='libx264', audio_codec='aac', logger="bar")
    print("Done!")

if __name__ == '__main__':
    assemble_video()
