import os
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from audio_retention import publish_clips, RETENTION_SECONDS


class AudioRetentionTest(unittest.TestCase):
    def test_reused_current_and_recent_previous_clips_survive_then_expire(self):
        with tempfile.TemporaryDirectory() as root:
            cache, output = Path(root)/'cache', Path(root)/'output'
            cache.mkdir()
            now = 1_000_000
            for name, age in [('current.mp3', RETENTION_SECONDS*2), ('previous.mp3', 60), ('expired.mp3', RETENTION_SECONDS+1)]:
                path=cache/name
                path.write_bytes(b'recording')
                os.utime(path, (now-age, now-age))
            self.assertEqual(publish_clips(cache,output,{'current.mp3'},now),2)
            self.assertTrue((output/'previous.mp3').exists())
            self.assertFalse((output/'expired.mp3').exists())
            self.assertEqual((cache/'current.mp3').stat().st_mtime,now)
            self.assertEqual(publish_clips(cache,output,{'current.mp3'},now+RETENTION_SECONDS+1),1)
            self.assertFalse((output/'previous.mp3').exists())
