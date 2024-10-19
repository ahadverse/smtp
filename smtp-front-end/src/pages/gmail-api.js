import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { FaArrowLeftLong } from "react-icons/fa6";
import { Editor } from "@tinymce/tinymce-react";
import Recipients from "@/components/reciepients/recipients";
import AddUser from "@/components/add-user/add-user";
import axios from "axios";
import CountComponent from "@/components/countdown/countdown";
import { useRouter } from "next/router";

const GmailApi = () => {
  const router = useRouter();
  const [openRecipientsModal, setRecipientsModal] = useState(false);
  const [emailCount, setEmailCount] = useState(0);
  const [emails, setEmails] = useState([]);
  const [users, setUsers] = useState([]);
  const [subject, setSubject] = useState("");
  const editorRef = useRef(null);
  const [desc, setDesc] = useState(null);
  const log = () => {
    if (editorRef.current) {
      setDesc(editorRef.current.getContent());
    }
  };
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    setLoading(true);

    const data = {
      emailList: emails,
      desc,
      subject,
      users,
    };
    try {
      const res = await axios.post(
        "http://localhost:5000/api/formultiuser",
        data
      );
      //if (res.data.message == "Emails sent successfully!") {
      //  setLoading(false);
      //  router.reload();
      //}
      // Handle success if needed
    } catch (error) {
      console.log(error);
      // Handle error if needed
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-white w-[1200px] my-10 bg-slate-950 p-5 h-fit rounded  m-auto">
      <Link
        className=" flex items-center gap-3 hover:border-white w-24 justify-center border border-slate-950"
        href={"/"}
      >
        <FaArrowLeftLong /> Home
      </Link>
      {loading ? (
        <CountComponent
          limit={emailCount}
          loading={loading}
          setLoading={setLoading}
        />
      ) : (
        <div className="flex justify-between gap-5 ">
          <div className="mt-5 w-8/12">
            <button
              onClick={() => setRecipientsModal(true)}
              className="bg-slate-950 w-full p-1 mb-3 border border-slate-800"
            >
              {emailCount < 1 ? "Add Recipients" : `Recipients (${emailCount})`}
            </button>
            <Recipients
              open={openRecipientsModal}
              close={() => setRecipientsModal(false)}
              setEmailCount={setEmailCount}
              emailCount={emailCount}
              setEmails={setEmails}
            />
            <label>
              <input
                className="bg-slate-950 w-full p-1 border border-slate-800"
                placeholder="Subject"
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <br />
            <br />
            <Editor
              onBlur={log}
              apiKey="asvbs540vyr3q9z4ihikhwwwq5hc75jjqw4i3akp424l8jrv"
              onInit={(evt, editor) => (editorRef.current = editor)}
              initialValue=""
              init={{
                height: 450,
                menubar: false,
                theme: "silver",
                skin: "oxide-dark",
                plugins: [
                  "charmap",
                  "preview",
                  "table",
                  "code",
                  "help",
                  "wordcount",
                ],
                toolbar:
                  "link code codesample | styles  | bold italic forecolor | alignleft aligncenter alignright " +
                  "bullist numlist | " +
                  "removeformat | help",
                image_caption: true,
                image_advtab: true,
                content_style:
                  "body { font-family:Helvetica,Arial,sans-serif; font-size:14px ; background : rgb(2 6 23 / 1); color : white }",
                relative_urls: true,
              }}
            />
            <button
              onClick={() => handleSubmit()}
              className="mt-5 bg-sky-600 px-10 py-3 rounded hover:bg-sky-700"
            >
              Send Email
            </button>
          </div>
          <div className={`w-4/12`}>
            <AddUser setUsers={setUsers} users={users} />
          </div>
        </div>
      )}
    </div>
  );
};

export default GmailApi;
