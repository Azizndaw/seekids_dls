import os
import asyncio
from moviepy.editor import VideoFileClip, ImageClip, concatenate_videoclips, AudioFileClip, CompositeVideoClip
import edge_tts

async def create_new_audio():
    text1 = "Pour justifier une absence ou un retard, c'est très simple. Il vous suffit de cliquer directement sur le compteur des absences ou des retards depuis le profil de votre enfant."
    text2 = "Une fois sur la page, vous retrouverez tout l'historique et vous pourrez utiliser le bouton signaler une absence pour prévenir l'administration à l'avance. Votre Espace Parent SeeKids est là pour vous simplifier la vie !"

    # On utilise une voix réaliste française (Denise). Le ton sera meilleur que gtts.
    voice = "fr-FR-DeniseNeural"
    
    communicate1 = edge_tts.Communicate(text1, voice)
    await communicate1.save("fin_part1.mp3")
    
    communicate2 = edge_tts.Communicate(text2, voice)
    await communicate2.save("fin_part2.mp3")

def extend_video():
    print("Loading original video...")
    original_video = VideoFileClip("dls_parent_portal_guide.mp4")
    
    print("Loading new auio...")
    a1 = AudioFileClip("fin_part1.mp3")
    a2 = AudioFileClip("fin_part2.mp3")
    
    img1_path = r'C:\Users\user\.gemini\antigravity\brain\c639b075-10ad-4380-ac83-006154fbd43d\media__1791658243398.png'
    img2_path = r'C:\Users\user\.gemini\antigravity\brain\c639b075-10ad-4380-ac83-006154fbd43d\media__1791658278564.png'
    
    # Create image clips maintaining width, centered on black bg
    img1 = ImageClip(img1_path).resize(width=original_video.w)
    clip_img1 = CompositeVideoClip([img1.set_pos('center')], size=(original_video.w, original_video.h)).set_duration(a1.duration)
    clip_img1 = clip_img1.set_audio(a1)
    
    img2 = ImageClip(img2_path).resize(width=original_video.w)
    clip_img2 = CompositeVideoClip([img2.set_pos('center')], size=(original_video.w, original_video.h)).set_duration(a2.duration)
    clip_img2 = clip_img2.set_audio(a2)
    
    print("Concatenating...")
    # Add crossfade between parts for smoothness ? Optional. Let's just append.
    final_video = concatenate_videoclips([original_video, clip_img1, clip_img2], method="compose")
    
    output_filename = "Guide_Parent_Complet_dls_2027.mp4"
    print(f"Rendering {output_filename}...")
    final_video.write_videofile(output_filename, fps=24, codec='libx264', audio_codec='aac', logger="bar")
    print("Done!")

if __name__ == "__main__":
    asyncio.run(create_new_audio())
    extend_video()
